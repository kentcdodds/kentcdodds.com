import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { cloudflareHandlers, resetCloudflareMockState } from '../cloudflare.ts'

const server = setupServer(...cloudflareHandlers)

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
	resetCloudflareMockState()
})

afterAll(() => {
	server.close()
})

describe('cloudflare MSW mocks', () => {
	test('Workers AI embeddings endpoint returns { result: { data } }', async () => {
		const res = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/@cf/google/embeddinggemma-300m',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text: ['hello world'] }),
			},
		)

		expect(res.ok).toBe(true)
		const json = (await res.json()) as any
		expect(json.success).toBe(true)
		expect(Array.isArray(json.result.data)).toBe(true)
		expect(Array.isArray(json.result.data[0])).toBe(true)
		expect(json.result.data[0].length).toBeGreaterThan(0)
	})

	test('Workers AI transcription endpoint returns { result: { text } }', async () => {
		const res = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/%40cf%2Fopenai%2Fwhisper',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'audio/mpeg',
				},
				body: new Uint8Array([1, 2, 3, 4]),
			},
		)

		expect(res.ok).toBe(true)
		const json = (await res.json()) as any
		expect(json.success).toBe(true)
		expect(typeof json.result.text).toBe('string')
		expect(json.result.text.toLowerCase()).toContain('mock transcription')
	})

	test('Workers AI text-to-speech endpoint returns audio bytes', async () => {
		const res = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/@cf/deepgram/aura-1',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					text: 'Hello from the Call Kent TTS mock.',
					speaker: 'asteria',
					encoding: 'mp3',
				}),
			},
		)

		expect(res.ok).toBe(true)
		expect(res.headers.get('content-type')).toMatch(/^audio\\//i)
		const buf = await res.arrayBuffer()
		expect(buf.byteLength).toBeGreaterThan(1024)
	})

	test('Vectorize query uses match-sorter when embedding text is known', async () => {
		// Seed the expected doc so the test is independent of the filesystem.
		const seedNdjson = `${JSON.stringify({
			id: '/__mock__/about-mcp',
			values: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			namespace: 'test',
			metadata: {
				type: 'page',
				title: 'About KCD MCP',
				url: '/__mock__/about-mcp',
				snippet: 'About KCD MCP',
			},
		})}\n`
		const seedRes = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/vectorize/v2/indexes/semantic-index/upsert',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/x-ndjson',
				},
				body: seedNdjson,
			},
		)
		expect(seedRes.ok).toBe(true)

		const embedRes = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/@cf/google/embeddinggemma-300m',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text: ['About KCD MCP'] }),
			},
		)
		expect(embedRes.ok).toBe(true)
		const embedJson = (await embedRes.json()) as any
		const vector = embedJson.result.data[0]
		expect(Array.isArray(vector)).toBe(true)

		const queryRes = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/vectorize/v2/indexes/semantic-index/query',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					vector,
					topK: 5,
					returnMetadata: 'all',
					namespace: 'test',
				}),
			},
		)
		expect(queryRes.ok).toBe(true)
		const queryJson = (await queryRes.json()) as any
		expect(queryJson.success).toBe(true)
		expect(queryJson.result.matches.length).toBeGreaterThan(0)
		expect(queryJson.result.matches[0].metadata.title).toBe('About KCD MCP')
		expect(String(queryJson.result.matches[0].metadata.url)).toContain(
			'about-mcp',
		)
	})

	test('Vectorize query returns seeded matches with metadata', async () => {
		const res = await fetch(
			'https://api.cloudflare.com/client/v4/accounts/acc123/vectorize/v2/indexes/semantic-index/query',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					vector: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					topK: 3,
					returnMetadata: 'all',
				}),
			},
		)

		expect(res.ok).toBe(true)
		const json = (await res.json()) as any
		expect(json.success).toBe(true)
		expect(Array.isArray(json.result.matches)).toBe(true)
		expect(json.result.matches.length).toBeGreaterThan(0)
		expect(typeof json.result.matches[0].id).toBe('string')
		expect(typeof json.result.matches[0].score).toBe('number')
		expect(typeof json.result.matches[0].metadata?.title).toBe('string')
	})

	test('Vectorize upsert + query + delete_by_ids works', async () => {
		const accountId = 'acc999'
		const indexName = 'upsert-index'
		const id = '/mock/doc'
		const values = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

		const ndjson = `${JSON.stringify({
			id,
			values,
			metadata: {
				type: 'doc',
				title: 'Mock Doc',
				url: 'https://kentcdodds.com/mock/doc',
				snippet: 'Inserted via Vectorize upsert mock.',
			},
		})}\n`

		// Vitest runs in `jsdom` by default in this repo; the `FormData` impl from
		// jsdom is not always compatible with Node's `fetch` (undici). Use a tiny,
		// hand-crafted multipart body to exercise the mock parser reliably.
		const boundary = '----vitest-multipart-boundary'
		const multipartBody = [
			`--${boundary}\r\n`,
			'Content-Disposition: form-data; name="vectors"; filename="vectors.ndjson"\r\n',
			'Content-Type: application/x-ndjson\r\n',
			'\r\n',
			ndjson,
			`\r\n--${boundary}--\r\n`,
		].join('')

		const upsertRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/upsert`,
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
				},
				body: multipartBody,
			},
		)
		expect(upsertRes.ok).toBe(true)

		const queryRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/query`,
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					vector: values,
					topK: 5,
					returnMetadata: 'all',
				}),
			},
		)
		expect(queryRes.ok).toBe(true)
		const queryJson = (await queryRes.json()) as any
		const ids = queryJson.result.matches.map((m: any) => m.id)
		expect(ids).toContain(id)

		const deleteRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/delete_by_ids`,
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ ids: [id] }),
			},
		)
		expect(deleteRes.ok).toBe(true)
		const deleteJson = (await deleteRes.json()) as any
		expect(deleteJson.success).toBe(true)
		expect(deleteJson.result.deleted).toBeGreaterThan(0)
	})
})
