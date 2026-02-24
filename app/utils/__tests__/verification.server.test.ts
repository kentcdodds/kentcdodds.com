import { generateTOTP } from '@epic-web/totp'
import bcrypt from 'bcrypt'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
	return {
		ensurePrimary: vi.fn(),
		prisma: {
			verification: {
				create: vi.fn(),
				findUnique: vi.fn(),
				findFirst: vi.fn(),
				delete: vi.fn(),
			},
		},
	}
})

vi.mock('#app/utils/litefs-js.server.ts', () => ({
	ensurePrimary: mocks.ensurePrimary,
}))

vi.mock('#app/utils/prisma.server.ts', () => ({
	prisma: mocks.prisma,
}))

import {
	consumeVerification,
	consumeVerificationForTarget,
	createVerification,
} from '../verification.server.ts'

test('createVerification stores a TOTP secret and returns a numeric code', async () => {
	vi.useFakeTimers()
	const now = new Date('2026-02-24T00:05:00Z')
	vi.setSystemTime(now)

	mocks.prisma.verification.create.mockImplementation(async ({ data }: any) => {
		return {
			id: 'verification-id',
			type: data.type,
			target: data.target,
			expiresAt: data.expiresAt,
		}
	})

	const { code, verification } = await createVerification({
		type: 'SIGNUP',
		target: 'test@example.com',
	})

	expect(code).toMatch(/^\d{6}$/)
	expect(verification).toMatchObject({
		id: 'verification-id',
		type: 'SIGNUP',
		target: 'test@example.com',
	})

	expect(mocks.ensurePrimary).toHaveBeenCalledTimes(1)
	expect(mocks.prisma.verification.create).toHaveBeenCalledTimes(1)

	const createArgs = mocks.prisma.verification.create.mock.calls[0]?.[0] as any
	expect(createArgs.data.secret).toMatch(/^[A-Z2-7]+=*$/)
	expect(createArgs.data.codeHash).toBeUndefined()

	vi.useRealTimers()
	vi.clearAllMocks()
})

describe('consumeVerification', () => {
	test('accepts the emailed code for the full max age window', async () => {
		vi.useFakeTimers()
		const start = new Date('2026-02-24T00:05:00Z')
		vi.setSystemTime(start)

		mocks.prisma.verification.create.mockImplementation(async ({ data }: any) => {
			return {
				id: 'v1',
				type: data.type,
				target: data.target,
				expiresAt: data.expiresAt,
			}
		})

		const { code, verification } = await createVerification({
			type: 'SIGNUP',
			target: 'test@example.com',
		})
		const secret = (mocks.prisma.verification.create.mock.calls[0]?.[0] as any).data
			.secret as string

		const expiresAt = verification.expiresAt
		mocks.prisma.verification.findUnique.mockResolvedValue({
			id: verification.id,
			type: verification.type,
			target: verification.target,
			secret,
			codeHash: null,
			expiresAt,
		})
		mocks.prisma.verification.delete.mockResolvedValue({} as any)

		// Nearly expired, but still within the 10 minute max age.
		vi.setSystemTime(new Date(start.getTime() + (9 * 60 + 50) * 1000))

		const result = await consumeVerification({
			id: verification.id,
			code,
			type: 'SIGNUP',
		})

		expect(result).toEqual({ target: verification.target })
		expect(mocks.prisma.verification.delete).toHaveBeenCalledTimes(1)

		vi.useRealTimers()
		vi.clearAllMocks()
	})

	test('rejects after expiresAt even if the TOTP window could match', async () => {
		vi.useFakeTimers()
		const start = new Date('2026-02-24T00:05:00Z')
		vi.setSystemTime(start)

		mocks.prisma.verification.create.mockImplementation(async ({ data }: any) => {
			return {
				id: 'v1',
				type: data.type,
				target: data.target,
				expiresAt: data.expiresAt,
			}
		})
		const { code, verification } = await createVerification({
			type: 'SIGNUP',
			target: 'test@example.com',
		})
		const secret = (mocks.prisma.verification.create.mock.calls[0]?.[0] as any).data
			.secret as string

		mocks.prisma.verification.findUnique.mockResolvedValue({
			id: verification.id,
			type: verification.type,
			target: verification.target,
			secret,
			codeHash: null,
			expiresAt: verification.expiresAt,
		})

		vi.setSystemTime(new Date(verification.expiresAt.getTime() + 1))

		const result = await consumeVerification({
			id: verification.id,
			code,
			type: 'SIGNUP',
		})
		expect(result).toBeNull()
		expect(mocks.prisma.verification.delete).not.toHaveBeenCalled()

		vi.useRealTimers()
		vi.clearAllMocks()
	})

	test('still consumes legacy verifications stored as bcrypt codeHash', async () => {
		vi.useFakeTimers()
		const now = new Date('2026-02-24T00:05:00Z')
		vi.setSystemTime(now)

		const code = '123456'
		const codeHash = await bcrypt.hash(code, 10)

		mocks.prisma.verification.findUnique.mockResolvedValue({
			id: 'legacy-id',
			type: 'SIGNUP',
			target: 'legacy@example.com',
			secret: null,
			codeHash,
			expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
		})
		mocks.prisma.verification.delete.mockResolvedValue({} as any)

		const result = await consumeVerification({
			id: 'legacy-id',
			code,
			type: 'SIGNUP',
		})

		expect(result).toEqual({ target: 'legacy@example.com' })
		expect(mocks.prisma.verification.delete).toHaveBeenCalledTimes(1)

		vi.useRealTimers()
		vi.clearAllMocks()
	})
})

test('consumeVerificationForTarget verifies and consumes the latest unexpired record', async () => {
	vi.useFakeTimers()
	const now = new Date('2026-02-24T00:05:00Z')
	vi.setSystemTime(now)

	const { otp, secret } = await generateTOTP({
		digits: 6,
		period: 30,
		algorithm: 'SHA-256',
		charSet: '0123456789',
	})

	const expiresAt = new Date(now.getTime() + 10 * 60 * 1000)
	mocks.prisma.verification.findFirst.mockResolvedValue({
		id: 'v-target',
		type: 'PASSWORD_RESET',
		target: 'target@example.com',
		secret,
		codeHash: null,
		expiresAt,
	})
	mocks.prisma.verification.delete.mockResolvedValue({} as any)

	const result = await consumeVerificationForTarget({
		target: 'target@example.com',
		code: otp,
		type: 'PASSWORD_RESET',
	})

	expect(result).toEqual({ target: 'target@example.com' })
	expect(mocks.prisma.verification.delete).toHaveBeenCalledTimes(1)

	const findFirstArgs = mocks.prisma.verification.findFirst.mock.calls[0]?.[0] as any
	expect(findFirstArgs.orderBy).toEqual({ createdAt: 'desc' })
	expect(findFirstArgs.where).toMatchObject({
		target: 'target@example.com',
		type: 'PASSWORD_RESET',
	})

	vi.useRealTimers()
	vi.clearAllMocks()
})

