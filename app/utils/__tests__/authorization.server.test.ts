import { expect, test } from 'vitest'
import {
	isUserAdmin,
	normalizeRole,
} from '#app/utils/authorization.server.ts'

test('normalizeRole maps legacy and unknown roles to MEMBER', () => {
	expect(normalizeRole('ADMIN')).toBe('ADMIN')
	expect(normalizeRole('MEMBER')).toBe('MEMBER')
	expect(normalizeRole('USER')).toBe('MEMBER')
	expect(normalizeRole('')).toBe('MEMBER')
	expect(normalizeRole(undefined)).toBe('MEMBER')
})

test('isUserAdmin checks normalized user role', () => {
	expect(isUserAdmin({ role: 'ADMIN' } as { role: string })).toBe(true)
	expect(isUserAdmin({ role: 'MEMBER' } as { role: string })).toBe(false)
	expect(isUserAdmin({ role: 'USER' } as { role: string })).toBe(false)
	expect(isUserAdmin(null)).toBe(false)
})
