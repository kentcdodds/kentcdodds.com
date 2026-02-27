import { describe, expect, test } from 'vitest'
import worker from '../worker.ts'

describe('security mock worker', () => {
	test('returns service metadata', async () => {
		const response = await worker.fetch(
			new Request('http://mock-security.local/__mocks/meta'),
			{},
			{},
		)
		expect(response.status).toBe(200)
		const payload = (await response.json()) as { service: string }
		expect(payload.service).toBe('security')
	})

	test('serves pwned-passwords ranges and gravatar responses', async () => {
		const pwnedResponse = await worker.fetch(
			new Request('http://mock-security.local/pwned/range/5BAA6'),
			{},
			{},
		)
		expect(pwnedResponse.status).toBe(200)
		const pwnedBody = await pwnedResponse.text()
		expect(pwnedBody).toContain('1E4C9B93F3F0682250B6CF8331B7EE68FD8')
		const pwnedRangeWithoutPrefixResponse = await worker.fetch(
			new Request('http://mock-security.local/range/5BAA6'),
			{},
			{},
		)
		expect(pwnedRangeWithoutPrefixResponse.status).toBe(200)

		const gravatarHeadResponse = await worker.fetch(
			new Request(
				'http://mock-security.local/gravatar/avatar/f8fee5dd63f8ef8f8ce83d4f92f5508f',
				{
					method: 'HEAD',
				},
			),
			{},
			{},
		)
		expect(gravatarHeadResponse.status).toBe(200)

		const avatarHeadResponse = await worker.fetch(
			new Request(
				'http://mock-security.local/avatar/c1c563b36d23e34002036e1de405f9ca',
				{
					method: 'HEAD',
				},
			),
			{},
			{},
		)
		expect(avatarHeadResponse.status).toBe(200)

		const missingAvatarHeadResponse = await worker.fetch(
			new Request('http://mock-security.local/avatar/notarealgravatarhash', {
				method: 'HEAD',
			}),
			{},
			{},
		)
		expect(missingAvatarHeadResponse.status).toBe(404)
	})
})
