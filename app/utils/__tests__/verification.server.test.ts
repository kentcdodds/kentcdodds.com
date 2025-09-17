import { describe, expect, test, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.server.ts'
import {
	prepareVerification,
	isCodeValid,
	verifySessionStorage,
} from '../verification.server.ts'

// Mock the prisma client
vi.mock('../prisma.server.ts', () => ({
	prisma: {
		verification: {
			create: vi.fn(),
			findFirst: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
}))

// Mock the session storage
vi.mock('@remix-run/node', () => ({
	createCookieSessionStorage: vi.fn(() => ({
		getSession: vi.fn(),
		commitSession: vi.fn(),
		destroySession: vi.fn(),
	})),
}))

// Mock URL constructor for testing
const mockRequest = {
	url: 'https://example.com/test',
} as Request

describe('verification.server', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('prepareVerification', () => {
		test('creates verification record and returns verify URL', async () => {
			const mockVerification = {
				id: 'verification-123',
				type: 'reset-password',
				target: 'test@example.com',
				secret: '123456',
				expiresAt: new Date(Date.now() + 600000),
			}

			vi.mocked(prisma.verification.deleteMany).mockResolvedValueOnce({
				count: 0,
			} as any)
			vi.mocked(prisma.verification.create).mockResolvedValueOnce(
				mockVerification as any,
			)

			const result = await prepareVerification({
				period: 600,
				request: mockRequest,
				type: 'reset-password',
				target: 'test@example.com',
			})

			expect(result).toEqual({
				otp: expect.stringMatching(/^\d{6}$/),
				verifyUrl: expect.any(URL),
				redirectTo: expect.any(URL),
			})

			// Check that the URL contains the expected parameters
			const verifyUrl = result.verifyUrl
			expect(verifyUrl.pathname).toBe('/verify')
			expect(verifyUrl.searchParams.get('code')).toMatch(/^\d{6}$/)
			expect(verifyUrl.searchParams.get('type')).toBe('reset-password')
			expect(verifyUrl.searchParams.get('target')).toBe('test@example.com')

			expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
				where: { target: 'test@example.com', type: 'reset-password' },
			})

			expect(prisma.verification.create).toHaveBeenCalledWith({
				data: {
					type: 'reset-password',
					target: 'test@example.com',
					secret: expect.stringMatching(/^\d{6}$/), // 6-digit code
					algorithm: 'SHA256',
					digits: 6,
					period: 600,
					charSet: '0123456789',
					expiresAt: expect.any(Date),
				},
			})
		})

		test('generates different codes for different requests', async () => {
			const mockVerification1 = {
				id: 'verification-1',
				type: 'reset-password',
				target: 'test1@example.com',
				secret: '123456',
				expiresAt: new Date(Date.now() + 600000),
			}

			const mockVerification2 = {
				id: 'verification-2',
				type: 'reset-password',
				target: 'test2@example.com',
				secret: '654321',
				expiresAt: new Date(Date.now() + 600000),
			}

			vi.mocked(prisma.verification.create)
				.mockResolvedValueOnce(mockVerification1 as any)
				.mockResolvedValueOnce(mockVerification2 as any)

			const result1 = await prepareVerification({
				period: 600,
				request: mockRequest,
				type: 'reset-password',
				target: 'test1@example.com',
			})

			const result2 = await prepareVerification({
				period: 600,
				request: mockRequest,
				type: 'reset-password',
				target: 'test2@example.com',
			})

			expect(result1.verifyUrl.searchParams.get('code')).toBe('123456')
			expect(result2.verifyUrl.searchParams.get('code')).toBe('654321')
		})

		test('sets correct expiration time based on period', async () => {
			const period = 300 // 5 minutes
			const beforeTime = Date.now()

			vi.mocked(prisma.verification.create).mockResolvedValueOnce({
				id: 'verification-123',
				type: 'reset-password',
				target: 'test@example.com',
				secret: '123456',
				expiresAt: new Date(beforeTime + period * 1000),
			} as any)

			await prepareVerification({
				period,
				request: mockRequest,
				type: 'reset-password',
				target: 'test@example.com',
			})

			const afterTime = Date.now()
			const createCall = vi.mocked(prisma.verification.create).mock.calls[0][0]
			const expiresAt = createCall.data.expiresAt.getTime()

			// Allow for some timing variance (within 1 second)
			expect(expiresAt).toBeGreaterThanOrEqual(beforeTime + period * 1000)
			expect(expiresAt).toBeLessThanOrEqual(afterTime + period * 1000)
		})
	})

	describe('isCodeValid', () => {
		test('returns true for valid, non-expired code', async () => {
			const mockVerification = {
				id: 'verification-123',
				type: 'reset-password',
				target: 'test@example.com',
				secret: '123456',
				expiresAt: new Date(Date.now() + 600000), // 10 minutes from now
			}

			vi.mocked(prisma.verification.findFirst).mockResolvedValueOnce(
				mockVerification as any,
			)
			vi.mocked(prisma.verification.delete).mockResolvedValueOnce(
				mockVerification as any,
			)

			const result = await isCodeValid({
				code: '123456',
				type: 'reset-password',
				target: 'test@example.com',
			})

			expect(result).toBe(true)

			expect(prisma.verification.findFirst).toHaveBeenCalledWith({
				where: {
					target: 'test@example.com',
					type: 'reset-password',
					expiresAt: { gt: expect.any(Date) },
				},
				select: {
					id: true,
					secret: true,
					expiresAt: true,
				},
			})

			expect(prisma.verification.delete).toHaveBeenCalledWith({
				where: { id: 'verification-123' },
			})
		})

		test('returns false for non-existent code', async () => {
			vi.mocked(prisma.verification.findFirst).mockResolvedValueOnce(null)

			const result = await isCodeValid({
				code: '999999',
				type: 'reset-password',
				target: 'test@example.com',
			})

			expect(result).toBe(false)
			expect(prisma.verification.delete).not.toHaveBeenCalled()
		})

		test('returns false for expired code', async () => {
			// The query includes expiresAt: { gt: new Date() }, so expired codes won't be found
			vi.mocked(prisma.verification.findFirst).mockResolvedValueOnce(null)

			const result = await isCodeValid({
				code: '123456',
				type: 'reset-password',
				target: 'test@example.com',
			})

			expect(result).toBe(false)
		})

		test('returns false for wrong type', async () => {
			vi.mocked(prisma.verification.findFirst).mockResolvedValueOnce(null)

			const result = await isCodeValid({
				code: '123456',
				type: 'onboarding',
				target: 'test@example.com',
			})

			expect(result).toBe(false)
		})

		test('returns false for wrong target', async () => {
			vi.mocked(prisma.verification.findFirst).mockResolvedValueOnce(null)

			const result = await isCodeValid({
				code: '123456',
				type: 'reset-password',
				target: 'wrong@example.com',
			})

			expect(result).toBe(false)
		})

		test('handles database errors gracefully', async () => {
			vi.mocked(prisma.verification.findFirst).mockRejectedValueOnce(
				new Error('Database error'),
			)

			const result = await isCodeValid({
				code: '123456',
				type: 'reset-password',
				target: 'test@example.com',
			})

			expect(result).toBe(false)
		})
	})

	describe('verifySessionStorage', () => {
		test('is properly configured', () => {
			expect(verifySessionStorage).toBeDefined()
			expect(verifySessionStorage.getSession).toBeInstanceOf(Function)
			expect(verifySessionStorage.commitSession).toBeInstanceOf(Function)
			expect(verifySessionStorage.destroySession).toBeInstanceOf(Function)
		})
	})
})