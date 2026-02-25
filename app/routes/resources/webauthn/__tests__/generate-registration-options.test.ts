import { expect, test, vi } from 'vitest'

const { mockRequireUser, mockFindMany } = vi.hoisted(() => {
	return {
		mockRequireUser: vi.fn(),
		mockFindMany: vi.fn(),
	}
})

vi.mock('#app/utils/session.server.js', () => ({
	requireUser: mockRequireUser,
}))

vi.mock('#app/utils/prisma.server.js', () => ({
	prisma: {
		passkey: {
			findMany: mockFindMany,
		},
	},
}))

import { loader } from '../generate-registration-options.ts'

test('generates registration options and sets challenge cookie', async () => {
	mockRequireUser.mockResolvedValue({
		id: 'user_123',
		email: 'user@example.com',
		firstName: 'User',
	})
	mockFindMany.mockResolvedValue([{ id: 'passkey-id-1' }])

	const request = new Request(
		'https://kentcdodds.com/resources/webauthn/generate-registration-options',
		{
			method: 'GET',
			headers: { Host: 'kentcdodds.com' },
		},
	)

	const result = (await loader({ request } as any)) as any

	if (result instanceof Response) {
		const body = (await result.json()) as {
			options?: {
				challenge?: string
				rp?: { id?: string; name?: string }
				excludeCredentials?: Array<unknown>
			}
		}
		expect(typeof body.options?.challenge).toBe('string')
		expect(body.options?.rp?.id).toBe('kentcdodds.com')
		expect(body.options?.excludeCredentials).toHaveLength(1)
		expect(result.headers.get('Set-Cookie')).toContain('webauthn-challenge=')
		return
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(typeof result.data?.options?.challenge).toBe('string')
	expect(result.data?.options?.rp?.id).toBe('kentcdodds.com')
	expect(result.data?.options?.excludeCredentials).toHaveLength(1)
	const headers = new Headers(result.init?.headers ?? undefined)
	expect(headers.get('Set-Cookie')).toContain('webauthn-challenge=')
})
