import { DataTableConstraintError } from '@remix-run/data-table'
import { expect, test } from 'vitest'
import {
	isNotFoundError,
	isUniqueConstraintError,
} from '../errors.server.ts'

test('isUniqueConstraintError detects data-table constraint errors', () => {
	expect(isUniqueConstraintError(new DataTableConstraintError('unique'))).toBe(
		true,
	)
})

test('isUniqueConstraintError detects sqlite and prisma codes', () => {
	expect(
		isUniqueConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' }),
	).toBe(true)
	expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true)
	expect(
		isUniqueConstraintError(new Error('UNIQUE constraint failed: User.email')),
	).toBe(true)
})

test('isNotFoundError detects prisma and message patterns', () => {
	expect(isNotFoundError({ code: 'P2025' })).toBe(true)
	expect(isNotFoundError(new Error('Record to update not found'))).toBe(true)
})
