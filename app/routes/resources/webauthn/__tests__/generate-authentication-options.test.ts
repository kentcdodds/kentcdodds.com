import { expect, test } from 'vitest'
import { action } from '../generate-authentication-options.ts'

test('generates authentication options and sets challenge cookie', async () => {
	const request = new Request(
		'https://kentcdodds.com/resources/webauthn/generate-authentication-options',
		{
			method: 'POST',
			headers: { Host: 'kentcdodds.com' },
		},
	)

	const result = (await action({ request } as any)) as any

	if (result instanceof Response) {
		const body = (await result.json()) as { options?: { challenge?: string } }
		expect(typeof body.options?.challenge).toBe('string')
		expect(result.headers.get('Set-Cookie')).toContain('webauthn-challenge=')
		return
	}

	expect(result.type).toBe('DataWithResponseInit')
	expect(typeof result.data?.options?.challenge).toBe('string')
	const headers = new Headers(result.init?.headers ?? undefined)
	expect(headers.get('Set-Cookie')).toContain('webauthn-challenge=')
})
