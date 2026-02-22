import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'

const VERIFICATION_CODE_DIGITS = 6
const VERIFICATION_CODE_MAX_AGE_MS = 1000 * 60 * 10

export type VerificationType = 'SIGNUP' | 'PASSWORD_RESET'

function generateVerificationCode() {
	// 000000 - 999999 (left-padded)
	const code = crypto
		.randomInt(0, Math.pow(10, VERIFICATION_CODE_DIGITS))
		.toString()
		.padStart(VERIFICATION_CODE_DIGITS, '0')
	return code
}

export async function createVerification({
	type,
	target,
}: {
	type: VerificationType
	target: string
}) {
	const code = generateVerificationCode()
	const codeHash = await bcrypt.hash(code, 10)
	const expiresAt = new Date(Date.now() + VERIFICATION_CODE_MAX_AGE_MS)

	await ensurePrimary()
	const verification = await prisma.verification.create({
		data: {
			type,
			target,
			codeHash,
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
		select: { id: true, type: true, target: true, codeHash: true, expiresAt: true },
	})

	if (!verification) return null
	if (verification.type !== type) return null
	if (Date.now() > verification.expiresAt.getTime()) return null

	const isValid = await bcrypt.compare(code, verification.codeHash)
	if (!isValid) return null

	await ensurePrimary()
	try {
		await prisma.verification.delete({ where: { id: verification.id } })
	} catch (error: unknown) {
		// Another request may have consumed/deleted it first.
		if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
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
		select: { id: true, type: true, target: true, codeHash: true, expiresAt: true },
	})
	if (!verification) return null

	const isValid = await bcrypt.compare(code, verification.codeHash)
	if (!isValid) return null

	await ensurePrimary()
	try {
		await prisma.verification.delete({ where: { id: verification.id } })
	} catch (error: unknown) {
		// Another request may have consumed/deleted it first.
		if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
			return null
		}
		throw error
	}

	return { target: verification.target }
}

