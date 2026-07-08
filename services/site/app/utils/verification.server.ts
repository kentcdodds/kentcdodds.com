import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { and, eq, gt } from '@remix-run/data-table'
import { db } from '#app/utils/db.server.ts'
import { verificationTable } from '#app/utils/db/schema.server.ts'

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

	const verification = await db.create(
		verificationTable,
		{
			type,
			target,
			codeHash,
			expiresAt,
		},
		{ returnRow: true },
	)

	return {
		verification: {
			id: verification.id,
			expiresAt: verification.expiresAt,
			target: verification.target,
			type: verification.type,
		},
		code,
	}
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
	const verification = await db.find(verificationTable, id)

	if (!verification) return null
	if (verification.type !== type) return null
	if (Date.now() > new Date(verification.expiresAt as Date).getTime()) return null

	const isValid = await bcrypt.compare(code, verification.codeHash)
	if (!isValid) return null

	const deleted = await db.delete(verificationTable, verification.id)
	if (!deleted) {
		// Another request may have consumed/deleted it first.
		return null
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
	const verification = await db.findOne(verificationTable, {
		where: and(eq('target', target), eq('type', type), gt('expiresAt', new Date())),
		orderBy: ['createdAt', 'desc'],
	})
	if (!verification) return null

	const isValid = await bcrypt.compare(code, verification.codeHash)
	if (!isValid) return null

	const deleted = await db.delete(verificationTable, verification.id)
	if (!deleted) {
		// Another request may have consumed/deleted it first.
		return null
	}

	return { target: verification.target }
}
