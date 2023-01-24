import crypto from 'crypto'
import {getRequiredServerEnvVar} from './misc'

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
