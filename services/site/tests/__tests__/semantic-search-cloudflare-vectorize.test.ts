import { expect, test, vi } from 'vitest'
import { vectorizeDeleteByIds } from '../../../../other/semantic-search/cloudflare.ts'

const vectorizeConfig = {
	accountId: 'account-id',
	apiToken: 'api-token',
	gatewayId: 'gateway-id',
	gatewayAuthToken: 'gateway-token',
	indexName: 'search-index',
	ids: ['vector-1', 'vector-2'],
}

test('vectorizeDeleteByIds calls the v2 delete_by_ids endpoint', async () => {
	const fetchMock = vi
		.spyOn(globalThis, 'fetch')
		.mockResolvedValue(
			new Response(
				JSON.stringify({ success: true, result: { mutationId: 'm1' } }),
			),
		)

	try {
		await vectorizeDeleteByIds(vectorizeConfig)
		expect(fetchMock).toHaveBeenCalledOnce()
		const [url, init] = fetchMock.mock.calls[0]!
		expect(String(url)).toBe(
			'https://api.cloudflare.com/client/v4/accounts/account-id/vectorize/v2/indexes/search-index/delete_by_ids',
		)
		expect(JSON.parse(String(init?.body))).toEqual({
			ids: ['vector-1', 'vector-2'],
		})
	} finally {
		fetchMock.mockRestore()
	}
})

test('vectorizeDeleteByIds does not mask non-legacy v2 errors', async () => {
	const fetchMock = vi
		.spyOn(globalThis, 'fetch')
		.mockResolvedValue(new Response('bad request', { status: 400 }))

	try {
		await expect(vectorizeDeleteByIds(vectorizeConfig)).rejects.toThrow(
			'Cloudflare API error: 400',
		)
		expect(fetchMock).toHaveBeenCalledOnce()
	} finally {
		fetchMock.mockRestore()
	}
})

test('vectorizeDeleteByIds falls back to legacy endpoint for legacy-signature errors', async () => {
	const fetchMock = vi
		.spyOn(globalThis, 'fetch')
		.mockResolvedValueOnce(new Response('not found', { status: 404 }))
		.mockResolvedValueOnce(
			new Response(
				JSON.stringify({ success: true, result: { mutationId: 'legacy-m1' } }),
			),
		)

	try {
		await vectorizeDeleteByIds(vectorizeConfig)
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
			'https://api.cloudflare.com/client/v4/accounts/account-id/vectorize/indexes/search-index/delete_by_ids',
		)
	} finally {
		fetchMock.mockRestore()
	}
})
