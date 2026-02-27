import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { getEnv } from './env.server.ts'
import { fetchWithTimeout } from './fetch-with-timeout.server.ts'

const pbkdf2Async = promisify(crypto.pbkdf2)
const PASSWORD_HASH_PREFIX = 'pbkdf2$sha256'
const PASSWORD_HASH_ITERATIONS = 310_000
const PASSWORD_HASH_KEY_LENGTH_BYTES = 32
const PASSWORD_HASH_SALT_BYTES = 16
const VERIFICATION_HASH_ITERATIONS = 120_000
const LEGACY_BCRYPT_PREFIX = '$2'
// Precomputed PBKDF2 hash for timing-equal password comparisons.
export const DUMMY_PASSWORD_HASH =
	'pbkdf2$sha256$310000$cGFzc3dvcmQtZHVtbXktc2FsdC12MQ$YJ5-f_TbmLNp__2wOy5KAgIeCQ66IJIJopdd8iV_iag'
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 256

export async function getPasswordHash(password: string) {
	return createPbkdf2Hash(password, { iterations: PASSWORD_HASH_ITERATIONS })
}

export async function verifyPassword({
	password,
	hash,
}: {
	password: string
	hash: string
}) {
	return verifyPbkdf2Hash({
		value: password,
		hash,
	})
}

export function isLegacyPasswordHash(hash: string) {
	return hash.startsWith(LEGACY_BCRYPT_PREFIX)
}

export async function getVerificationCodeHash(code: string) {
	return createPbkdf2Hash(code, { iterations: VERIFICATION_HASH_ITERATIONS })
}

export async function verifyVerificationCode({
	code,
	hash,
}: {
	code: string
	hash: string
}) {
	return verifyPbkdf2Hash({
		value: code,
		hash,
	})
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
		const endpoint = new URL(
			`range/${prefix}`,
			`${getEnv().PWNED_PASSWORDS_API_BASE_URL.replace(/\/+$/, '')}/`,
		)
		const response = await fetchWithTimeout(
			endpoint.toString(),
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

async function createPbkdf2Hash(
	value: string,
	{ iterations }: { iterations: number },
) {
	const salt = crypto.randomBytes(PASSWORD_HASH_SALT_BYTES)
	const key = await pbkdf2Async(
		value,
		salt,
		iterations,
		PASSWORD_HASH_KEY_LENGTH_BYTES,
		'sha256',
	)
	return serializePbkdf2Hash({
		iterations,
		salt,
		key: Buffer.from(key),
	})
}

async function verifyPbkdf2Hash({
	value,
	hash,
}: {
	value: string
	hash: string
}) {
	const parsedHash = parsePbkdf2Hash(hash)
	if (!parsedHash) return false
	const candidateKey = Buffer.from(
		await pbkdf2Async(
			value,
			parsedHash.salt,
			parsedHash.iterations,
			parsedHash.key.length,
			'sha256',
		),
	)
	if (candidateKey.length !== parsedHash.key.length) return false
	return crypto.timingSafeEqual(candidateKey, parsedHash.key)
}

function serializePbkdf2Hash({
	iterations,
	salt,
	key,
}: {
	iterations: number
	salt: Buffer
	key: Buffer
}) {
	return `${PASSWORD_HASH_PREFIX}$${iterations}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

function parsePbkdf2Hash(hash: string) {
	const [prefix, digest, iterationRaw, saltRaw, keyRaw] = hash.split('$')
	if (!prefix || !digest || !iterationRaw || !saltRaw || !keyRaw) return null
	if (`${prefix}$${digest}` !== PASSWORD_HASH_PREFIX) return null
	const iterations = Number.parseInt(iterationRaw, 10)
	if (!Number.isInteger(iterations) || iterations <= 0) return null
	try {
		return {
			iterations,
			salt: Buffer.from(saltRaw, 'base64url'),
			key: Buffer.from(keyRaw, 'base64url'),
		}
	} catch {
		return null
	}
}
