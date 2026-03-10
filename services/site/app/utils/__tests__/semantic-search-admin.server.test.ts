import { describe, expect, test } from 'vitest'
import { getSemanticSearchAdminStore } from '../semantic-search-admin.server.ts'

// Tests load `.env` first (override=false), so keep this test self-contained in
// case the local `.env` has placeholder values like `MOCK_R2_ENDPOINT`.
process.env.R2_BUCKET = 'mock-r2-bucket'
process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'

describe('semantic search admin store (R2 via MSW)', () => {
	test('lists and reads seeded manifests', async () => {
		const { store, configured } = getSemanticSearchAdminStore()
		expect(configured).toBe(true)
		expect(store).not.toBeNull()
		if (!store) throw new Error('Expected store')

		const keys = await store.listManifestKeys()
		expect(keys).toEqual([
			'manifests/podcasts.json',
			'manifests/repo-content.json',
			'manifests/youtube-PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf.json',
		])

		const manifest = await store.getManifest('manifests/repo-content.json')
		expect(manifest?.version).toBe(1)
		expect(manifest?.docs?.['page:uses']?.url).toBe('/uses')
	})

	test('round-trips put/get via mocked R2', async () => {
		const { store } = getSemanticSearchAdminStore()
		if (!store) throw new Error('Expected store')

		await store.putManifest('manifests/test-roundtrip.json', {
			version: 1,
			docs: {
				'test:doc': {
					type: 'test',
					url: '/test/doc',
					title: 'Test doc',
					chunks: [
						{
							id: 'test:doc:chunk:0',
							hash: 'hash-0',
							snippet: 'Hello from MSW R2',
							chunkIndex: 0,
							chunkCount: 1,
						},
					],
				},
			},
		})

		const keys = await store.listManifestKeys()
		expect(keys).toContain('manifests/test-roundtrip.json')

		const manifest = await store.getManifest('manifests/test-roundtrip.json')
		expect(manifest?.docs?.['test:doc']?.title).toBe('Test doc')
	})
})
