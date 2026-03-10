import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { fetchWithTimeout } from './fetch-with-timeout.server.ts'

const BCRYPT_COST = 10
// Precomputed bcrypt hash for timing-equal password comparisons.
export const DUMMY_PASSWORD_HASH =
	'$2b$10$fvrjcVttSLHkz9k1tjMfqu9ADv42kasEph8Oi2UR0zQNC9h0svQyu'
const PASSWORD_MIN_LENGTH = 8
// NOTE: bcrypt only uses the first 72 bytes of the password.
// Enforcing this avoids giving users a false sense of security.
const PASSWORD_MAX_BYTES = 72

export async function getPasswordHash(password: string) {
	return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword({
	password,
	hash,
}: {
	password: string
	hash: string
}) {
	return bcrypt.compare(password, hash)
}

function getPasswordHashParts(password: string) {
	const hash = crypto
		.createHash('sha1')
		.update(password, 'utf8')
		.digest('hex')
		.toUpperCase()
	return [hash.slice(0, 5), hash.slice(5)] as const
}

async function checkIsCommonPassword(password: string) {
	const [prefix, suffix] = getPasswordHashParts(password)
	try {
		const response = await fetchWithTimeout(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			{},
			1000,
		)
		if (!response.ok) return false
		const data = await response.text()
		return data.split(/\r?\n/).some((line) => {
			const [hashSuffix] = line.split(':')
			return hashSuffix === suffix
		})
	} catch (error) {
		// We don't want a third-party outage to block password creation/reset.
		if (error instanceof Error && error.message === 'Request timeout') {
			console.warn('Password commonality check timed out')
			return false
		}
		console.warn('Unknown error during password commonality check', error)
		return false
	}
}

function getPasswordValidationError(password: string) {
	if (typeof password !== 'string' || !password.length) {
		return 'Password is required'
	}
	if (password.length < PASSWORD_MIN_LENGTH) {
		return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
	}
	if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
		return `Password is too long (max ${PASSWORD_MAX_BYTES} bytes)`
	}
	return null
}

export async function getPasswordStrengthError(password: string) {
	const basicError = getPasswordValidationError(password)
	if (basicError) return basicError
	const isCommon = await checkIsCommonPassword(password)
	if (isCommon) {
		return 'This password is too common. Please choose a different one.'
	}
	return null
}
