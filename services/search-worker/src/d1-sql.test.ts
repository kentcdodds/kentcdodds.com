import { describe, expect, it } from 'vitest'
import { sql } from './d1-sql.ts'

describe('sql', () => {
	it('collapses multiline to single line', () => {
		expect(sql`SELECT 1`).toBe('SELECT 1')
		expect(sql`
			SELECT *
			FROM t
			WHERE x = 1
		`).toBe('SELECT * FROM t WHERE x = 1')
	})

	it('joins static string interpolations', () => {
		const col = 'id'
		expect(sql`SELECT ${col} FROM t`).toBe('SELECT id FROM t')
	})
})
