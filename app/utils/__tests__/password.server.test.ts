import { expect, test } from 'vitest'
import {
	DUMMY_PASSWORD_HASH,
	getPasswordHash,
	getVerificationCodeHash,
	isLegacyPasswordHash,
	verifyPassword,
	verifyVerificationCode,
} from '../password.server.ts'

test('getPasswordHash creates pbkdf2 hashes that can be verified', async () => {
	const password = 'correct horse battery staple'
	const hash = await getPasswordHash(password)

	expect(hash.startsWith('pbkdf2$sha256$')).toBe(true)
	await expect(verifyPassword({ password, hash })).resolves.toBe(true)
	await expect(
		verifyPassword({ password: 'wrong password', hash }),
	).resolves.toBe(false)
})

test('legacy bcrypt hashes are identified for forced reset', () => {
	expect(isLegacyPasswordHash(DUMMY_PASSWORD_HASH)).toBe(false)
	expect(
		isLegacyPasswordHash(
			'$2b$10$fvrjcVttSLHkz9k1tjMfqu9ADv42kasEph8Oi2UR0zQNC9h0svQyu',
		),
	).toBe(true)
})

test('verification codes use the same pbkdf2 verifier', async () => {
	const code = '123456'
	const hash = await getVerificationCodeHash(code)

	expect(hash.startsWith('pbkdf2$sha256$')).toBe(true)
	await expect(verifyVerificationCode({ code, hash })).resolves.toBe(true)
	await expect(
		verifyVerificationCode({ code: '654321', hash }),
	).resolves.toBe(false)
})
