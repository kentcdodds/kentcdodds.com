import { constructFrom } from 'date-fns'
import { expect, test } from 'vitest'
import {
	getYearsTeaching,
	TEACHING_STARTED_YEAR,
} from '#app/utils/years-teaching.ts'

test('getYearsTeaching returns calendar years since teaching start', () => {
	expect(getYearsTeaching(new Date(`${TEACHING_STARTED_YEAR}-06-01`))).toBe(0)
	expect(getYearsTeaching(new Date('2026-07-28'))).toBe(12)
})

test('getYearsTeaching avoids date-fns constructFrom Date.constructor path (KCD-100)', () => {
	const brokenDate = new Date(TEACHING_STARTED_YEAR, 0, 0)
	Object.defineProperty(brokenDate, 'constructor', { value: undefined })
	expect(() => constructFrom(brokenDate, Date.now())).toThrow(
		/not a constructor/,
	)

	expect(getYearsTeaching(new Date('2026-07-28'))).toBe(12)
})
