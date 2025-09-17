import { describe, expect, test, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import { prisma } from '../prisma.server.ts'
import {
	getPasswordHash,
	verifyUserPassword,
	loginWithPassword,
	signup,
	checkIsCommonPassword,
	getPasswordHashParts,
} from '../auth.server.ts'

// Mock the prisma client
vi.mock('../prisma.server.ts', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
		password: {
			create: vi.fn(),
		},
	},
}))

// Mock fetch for pwned passwords API
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('auth.server', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getPasswordHash', () => {
		test('hashes password with bcrypt', async () => {
			const password = 'test-password-123'
			const hash = await getPasswordHash(password)

			expect(hash).toMatch(/^\$2[ayb]\$.{56}$/) // bcrypt hash format
			expect(await bcrypt.compare(password, hash)).toBe(true)
		})

		test('generates different hashes for same password', async () => {
			const password = 'test-password-123'
			const hash1 = await getPasswordHash(password)
			const hash2 = await getPasswordHash(password)

			expect(hash1).not.toBe(hash2)
			expect(await bcrypt.compare(password, hash1)).toBe(true)
			expect(await bcrypt.compare(password, hash2)).toBe(true)
		})
	})

	describe('verifyUserPassword', () => {
		test('returns true for correct password', async () => {
			const password = 'correct-password'
			const hash = await bcrypt.hash(password, 10)

			const result = await verifyUserPassword(password, hash)
			expect(result).toBe(true)
		})

		test('returns false for incorrect password', async () => {
			const correctPassword = 'correct-password'
			const wrongPassword = 'wrong-password'
			const hash = await bcrypt.hash(correctPassword, 10)

			const result = await verifyUserPassword(wrongPassword, hash)
			expect(result).toBe(false)
		})
	})

	describe('loginWithPassword', () => {
		test('returns user data for valid credentials', async () => {
			const email = 'test@example.com'
			const password = 'test-password'
			const hash = await bcrypt.hash(password, 10)

			const mockUser = {
				id: 'user-1',
				email,
				firstName: 'Test',
			}

			const mockPassword = {
				hash,
				userId: 'user-1',
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
				...mockUser,
				password: mockPassword,
			} as any)

			const result = await loginWithPassword({ email, password })

			expect(result).toEqual({
				user: mockUser,
			})
			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email },
				include: { password: { select: { hash: true } } },
			})
		})

		test('returns null for non-existent user', async () => {
			const email = 'nonexistent@example.com'
			const password = 'test-password'

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

			const result = await loginWithPassword({ email, password })

			expect(result).toBeNull()
		})

		test('returns null for user without password', async () => {
			const email = 'test@example.com'
			const password = 'test-password'

			const mockUser = {
				id: 'user-1',
				email,
				firstName: 'Test',
				password: null,
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

			const result = await loginWithPassword({ email, password })

			expect(result).toBeNull()
		})

		test('returns null for incorrect password', async () => {
			const email = 'test@example.com'
			const correctPassword = 'correct-password'
			const wrongPassword = 'wrong-password'
			const hash = await bcrypt.hash(correctPassword, 10)

			const mockUser = {
				id: 'user-1',
				email,
				firstName: 'Test',
				password: { hash },
			}

			vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

			const result = await loginWithPassword({
				email,
				password: wrongPassword,
			})

			expect(result).toBeNull()
		})
	})

	describe('signup', () => {
		test('creates user with hashed password', async () => {
			const userData = {
				email: 'test@example.com',
				password: 'test-password',
				firstName: 'Test',
				team: 'BLUE' as const,
			}

			const mockUser = {
				id: 'user-1',
				email: userData.email,
				firstName: userData.firstName,
				team: userData.team,
			}

			vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser as any)
			vi.mocked(prisma.password.create).mockResolvedValueOnce({
				userId: 'user-1',
				hash: 'hashed-password',
			} as any)

			const result = await signup(userData)

			expect(result).toEqual({
				user: mockUser,
			})

			expect(prisma.user.create).toHaveBeenCalledWith({
				data: {
					email: userData.email,
					firstName: userData.firstName,
					team: userData.team,
				},
			})

			expect(prisma.password.create).toHaveBeenCalledWith({
				data: {
					userId: 'user-1',
					hash: expect.stringMatching(/^\$2[ayb]\$.{56}$/),
				},
			})
		})

		test('throws error if user creation fails', async () => {
			const userData = {
				email: 'test@example.com',
				password: 'test-password',
				firstName: 'Test',
				team: 'BLUE' as const,
			}

			const error = new Error('User creation failed')
			vi.mocked(prisma.user.create).mockRejectedValueOnce(error)

			await expect(signup(userData)).rejects.toThrow('User creation failed')
		})
	})

	describe('checkIsCommonPassword', () => {
		test('returns true when password is found in breach database', async () => {
			const password = 'testpassword'
			const [prefix, suffix] = getPasswordHashParts(password)

			mockFetch.mockResolvedValueOnce({
				ok: true,
				text: () =>
					Promise.resolve(
						`1234567890123456789012345678901234A:1\n${suffix}:1234`,
					),
			})

			const result = await checkIsCommonPassword(password)

			expect(result).toBe(true)
			expect(mockFetch).toHaveBeenCalledWith(
				`https://api.pwnedpasswords.com/range/${prefix}`,
				{ signal: expect.any(AbortSignal) },
			)
		})

		test('returns false when password is not found in breach database', async () => {
			const password = 'sup3r-dup3r-s3cret'
			const [prefix] = getPasswordHashParts(password)

			mockFetch.mockResolvedValueOnce({
				ok: true,
				text: () =>
					Promise.resolve(
						'1234567890123456789012345678901234A:1\n' +
							'1234567890123456789012345678901234B:2',
					),
			})

			const result = await checkIsCommonPassword(password)

			expect(result).toBe(false)
		})

		test('returns false when API returns 500', async () => {
			const password = 'testpassword'

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
			})

			const result = await checkIsCommonPassword(password)

			expect(result).toBe(false)
		})

		test('returns false when request times out', async () => {
			const password = 'testpassword'

			mockFetch.mockRejectedValueOnce(new Error('AbortError'))

			const result = await checkIsCommonPassword(password)

			expect(result).toBe(false)
		})

		test('returns false when network error occurs', async () => {
			const password = 'testpassword'

			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await checkIsCommonPassword(password)

			expect(result).toBe(false)
		})
	})

	describe('getPasswordHashParts', () => {
		test('returns correct prefix and suffix for known password', () => {
			// Using a password with known SHA-1 hash for testing
			const password = 'password'
			const [prefix, suffix] = getPasswordHashParts(password)

			expect(prefix).toHaveLength(5)
			expect(suffix).toHaveLength(35)
			expect(prefix + suffix).toHaveLength(40) // Full SHA-1 hash length
		})

		test('generates consistent hash parts for same password', () => {
			const password = 'test-password-123'
			const [prefix1, suffix1] = getPasswordHashParts(password)
			const [prefix2, suffix2] = getPasswordHashParts(password)

			expect(prefix1).toBe(prefix2)
			expect(suffix1).toBe(suffix2)
		})

		test('generates different hash parts for different passwords', () => {
			const password1 = 'password1'
			const password2 = 'password2'

			const [prefix1, suffix1] = getPasswordHashParts(password1)
			const [prefix2, suffix2] = getPasswordHashParts(password2)

			expect(prefix1).not.toBe(prefix2)
			expect(suffix1).not.toBe(suffix2)
		})
	})
})