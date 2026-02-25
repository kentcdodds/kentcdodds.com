import { expect, test } from 'vitest'
import worker from './worker.ts'

test('meta endpoint advertises dashboard support', async () => {
	const response = await worker.fetch(
		new Request('http://mock-discord.local/__mocks/meta'),
		{},
		{} as any,
	)
	const payload = (await response.json()) as {
		service: string
		themeSupport: Array<string>
		responsive: boolean
	}

	expect(payload.service).toBe('discord')
	expect(payload.themeSupport).toEqual(['light', 'dark'])
	expect(payload.responsive).toBe(true)
})

test('discord oauth and member endpoints return expected payloads', async () => {
	const tokenResponse = await worker.fetch(
		new Request('http://mock-discord.local/api/oauth2/token', {
			method: 'POST',
		}),
		{},
		{} as any,
	)
	const tokenPayload = (await tokenResponse.json()) as { access_token?: string }
	expect(tokenPayload.access_token).toBe('test_access_token')

	await worker.fetch(
		new Request('http://mock-discord.local/api/guilds/1/members/test-user', {
			method: 'PUT',
			body: JSON.stringify({ access_token: 'test_access_token' }),
		}),
		{},
		{} as any,
	)

	await worker.fetch(
		new Request('http://mock-discord.local/api/guilds/1/members/test-user', {
			method: 'PATCH',
			body: JSON.stringify({ roles: ['member-role', 'team-role'] }),
		}),
		{},
		{} as any,
	)

	const memberResponse = await worker.fetch(
		new Request('http://mock-discord.local/api/guilds/1/members/test-user'),
		{},
		{} as any,
	)
	const memberPayload = (await memberResponse.json()) as {
		user: { id: string }
		roles: Array<string>
	}
	expect(memberPayload.user.id).toBe('test-user')
	expect(memberPayload.roles).toEqual(['member-role', 'team-role'])
})
