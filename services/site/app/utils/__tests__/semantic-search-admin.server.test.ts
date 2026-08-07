import { describe, expect, test } from 'vitest'
import {
	getSemanticSearchAdminStore,
	parseListObjectsV2Xml,
} from '../semantic-search-admin.server.ts'

// Tests load `.env` first (override=false), so keep this test self-contained in
// case the local `.env` has placeholder values like `MOCK_R2_ENDPOINT`.
process.env.R2_BUCKET = 'mock-r2-bucket'
process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'

describe('parseListObjectsV2Xml', () => {
	test('extracts keys, truncation, and XML-entity-escaped key characters', () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>mock-r2-bucket</Name>
  <Prefix>manifests/</Prefix>
  <KeyCount>2</KeyCount>
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>token&amp;next</NextContinuationToken>
  <Contents>
    <Key>manifests/foo&amp;bar.json</Key>
  </Contents>
  <Contents>
    <Key>manifests/a&lt;b&gt;c.json</Key>
  </Contents>
</ListBucketResult>`

		expect(parseListObjectsV2Xml(xml)).toEqual({
			keys: ['manifests/foo&bar.json', 'manifests/a<b>c.json'],
			isTruncated: true,
			nextContinuationToken: 'token&next',
		})
	})

	test('handles a single Contents node and non-truncated pages', () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <IsTruncated>false</IsTruncated>
  <Contents>
    <Key>manifests/only.json</Key>
  </Contents>
</ListBucketResult>`

		expect(parseListObjectsV2Xml(xml)).toEqual({
			keys: ['manifests/only.json'],
			isTruncated: false,
			nextContinuationToken: undefined,
		})
	})
})

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

	test('lists keys that require XML entity escaping', async () => {
		const { store } = getSemanticSearchAdminStore()
		if (!store) throw new Error('Expected store')

		const key = 'manifests/ampersand-&-name.json'
		await store.putManifest(key, {
			version: 1,
			docs: {},
		})

		const keys = await store.listManifestKeys()
		expect(keys).toContain(key)
		await expect(store.getManifest(key)).resolves.toEqual({
			version: 1,
			docs: {},
		})
	})
})
