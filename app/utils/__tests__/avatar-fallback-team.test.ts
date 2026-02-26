import { expect, test } from 'vitest'
import { getAvatarFallbackTeam } from '../misc.ts'

test('getAvatarFallbackTeam keeps explicit team values', () => {
	expect(getAvatarFallbackTeam({ team: 'BLUE', email: null })).toBe('BLUE')
	expect(getAvatarFallbackTeam({ team: 'RED', email: null })).toBe('RED')
	expect(getAvatarFallbackTeam({ team: 'YELLOW', email: null })).toBe('YELLOW')
})

test('getAvatarFallbackTeam derives deterministic non-unknown team from email', () => {
	const team = getAvatarFallbackTeam({
		team: undefined,
		email: 'someone-without-gravatar@example.com',
	})
	const repeated = getAvatarFallbackTeam({
		team: undefined,
		email: 'someone-without-gravatar@example.com',
	})
	expect(team).toBe(repeated)
	expect(['BLUE', 'RED', 'YELLOW']).toContain(team)
})
