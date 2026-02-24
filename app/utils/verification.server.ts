import bcrypt from 'bcrypt'
import { generateTOTP, verifyTOTP } from '@epic-web/totp'
import type { HashAlgorithm } from '@epic-web/totp'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'

const VERIFICATION_CODE_DIGITS = 6
const VERIFICATION_CODE_PERIOD_SECONDS = 30
const VERIFICATION_CODE_MAX_AGE_MS = 1000 * 60 * 10
const VERIFICATION_CODE_ALGORITHM: HashAlgorithm = 'SHA-256'
const VERIFICATION_CODE_CHARSET = '0123456789'
const VERIFICATION_CODE_WINDOW = Math.ceil(
	VERIFICATION_CODE_MAX_AGE_MS / (VERIFICATION_CODE_PERIOD_SECONDS * 1000),
)

export type VerificationType = 'SIGNUP' | 'PASSWORD_RESET'

async function isValidVerificationCode({
	code,
	verification,
}: {
	code: string
	verification: { secret: string | null; codeHash: string | null }
}) {
	if (verification.secret) {
		const result = await verifyTOTP({
			otp: code,
			secret: verification.secret,
			digits: VERIFICATION_CODE_DIGITS,
			period: VERIFICATION_CODE_PERIOD_SECONDS,
			algorithm: VERIFICATION_CODE_ALGORITHM,
			charSet: VERIFICATION_CODE_CHARSET,
			// Ensure the emailed code works for the full max age from creation.
			window: VERIFICATION_CODE_WINDOW,
		})
		return Boolean(result)
	}

	// Backwards compatibility: existing rows stored a bcrypt hash of the code.
	if (verification.codeHash) {
		return bcrypt.compare(code, verification.codeHash)
	}

	return false
}

export async function createVerification({
	type,
	target,
}: {
	type: VerificationType
	target: string
}) {
	const { otp: code, secret } = await generateTOTP({
		digits: VERIFICATION_CODE_DIGITS,
		period: VERIFICATION_CODE_PERIOD_SECONDS,
		algorithm: VERIFICATION_CODE_ALGORITHM,
		charSet: VERIFICATION_CODE_CHARSET,
	})
	const expiresAt = new Date(Date.now() + VERIFICATION_CODE_MAX_AGE_MS)

	await ensurePrimary()
	const verification = await prisma.verification.create({
		data: {
			type,
			target,
			secret,
			expiresAt,
		},
		select: { id: true, expiresAt: true, target: true, type: true },
	})

	return { verification, code }
}

export async function consumeVerification({
	id,
	code,
	type,
}: {
	id: string
	code: string
	type: VerificationType
}) {
	const verification = await prisma.verification.findUnique({
		where: { id },
		select: {
			id: true,
			type: true,
			target: true,
			secret: true,
			codeHash: true,
			expiresAt: true,
		},
	})

	if (!verification) return null
	if (verification.type !== type) return null
	if (Date.now() > verification.expiresAt.getTime()) return null

	const isValid = await isValidVerificationCode({ code, verification })
	if (!isValid) return null

	await ensurePrimary()
	try {
		await prisma.verification.delete({ where: { id: verification.id } })
	} catch (error: unknown) {
		// Another request may have consumed/deleted it first.
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return null
		}
		throw error
	}

	return { target: verification.target }
}

export async function consumeVerificationForTarget({
	target,
	code,
	type,
}: {
	target: string
	code: string
	type: VerificationType
}) {
	const verification = await prisma.verification.findFirst({
		where: {
			target,
			type,
			expiresAt: { gt: new Date() },
		},
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			type: true,
			target: true,
			secret: true,
			codeHash: true,
			expiresAt: true,
		},
	})
	if (!verification) return null

	const isValid = await isValidVerificationCode({ code, verification })
	if (!isValid) return null

	await ensurePrimary()
	try {
		await prisma.verification.delete({ where: { id: verification.id } })
	} catch (error: unknown) {
		// Another request may have consumed/deleted it first.
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return null
		}
		throw error
	}

	return { target: verification.target }
}
