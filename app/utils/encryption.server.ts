import crypto from 'crypto'

// NOTE: This module is imported directly by Node during production server
// startup (for example, the pre-deploy healthcheck). Node can strip types from
// `.ts`, but it cannot execute `.tsx`, so this file must not depend on
// `misc.tsx`.
function getRequiredServerEnvVar(
	key: string,
	devValue: string = `${key}-dev-value`,
) {
	const envVal = process.env[key]
	if (envVal) return envVal
	if (process.env.NODE_ENV === 'production') {
		throw new Error(`${key} is a required env variable`)
	}
	return devValue
}

const algorithm = 'aes-256-gcm'

const secret = getRequiredServerEnvVar('MAGIC_LINK_SECRET')
const ENCRYPTION_KEY = crypto.scryptSync(secret, 'salt', 32)
const IV_LENGTH = 12
const UTF8 = 'utf8'
const HEX = 'hex'

export function encrypt(text: string) {
	const iv = crypto.randomBytes(IV_LENGTH)
	const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv)
	let encrypted = cipher.update(text, UTF8, HEX)
	encrypted += cipher.final(HEX)
	const authTag = cipher.getAuthTag()
	return `${iv.toString(HEX)}:${authTag.toString(HEX)}:${encrypted}`
}

export function decrypt(text: string) {
	const [ivPart, authTagPart, encryptedText] = text.split(':')
	if (!ivPart || !authTagPart || !encryptedText) {
		throw new Error('Invalid text.')
	}

	const iv = Buffer.from(ivPart, HEX)
	const authTag = Buffer.from(authTagPart, HEX)
	const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv)
	decipher.setAuthTag(authTag)
	let decrypted = decipher.update(encryptedText, HEX, UTF8)
	decrypted += decipher.final(UTF8)
	return decrypted
}
