import { describe, expect, test, vi } from 'vitest'

const seedManifestEntries = {
	'manifests/podcasts.json': {
		version: 1,
		docs: {},
	},
	'manifests/repo-content.json': {
		version: 1,
		docs: {
			'page:uses': {
				type: 'page',
				url: '/uses',
				title: 'Uses',
				chunks: [],
			},
		},
	},
	'manifests/youtube-PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf.json': {
		version: 1,
		docs: {},
	},
} as const

const mockState = vi.hoisted(() => ({
	objects: new Map<string, string>(),
}))

function resetSeededObjects() {
	mockState.objects.clear()
	for (const [key, value] of Object.entries(seedManifestEntries)) {
		mockState.objects.set(key, JSON.stringify(value))
	}
}

vi.mock('@aws-sdk/client-s3', () => {
	class GetObjectCommand {
		input: { Bucket: string; Key: string }
		constructor(input: { Bucket: string; Key: string }) {
			this.input = input
		}
	}

	class ListObjectsV2Command {
		input: { Bucket: string; Prefix: string }
		constructor(input: { Bucket: string; Prefix: string }) {
			this.input = input
		}
	}

	class PutObjectCommand {
		input: { Bucket: string; Key: string; Body: string }
		constructor(input: { Bucket: string; Key: string; Body: string }) {
			this.input = input
		}
	}

	class S3Client {
		async send(command: unknown) {
			if (command instanceof ListObjectsV2Command) {
				const keys = Array.from(mockState.objects.keys())
					.filter((key) => key.startsWith(command.input.Prefix))
					.sort((a, b) => a.localeCompare(b))
				return {
					IsTruncated: false,
					Contents: keys.map((key) => ({ Key: key })),
				}
			}
			if (command instanceof GetObjectCommand) {
				const body = mockState.objects.get(command.input.Key)
				if (typeof body === 'undefined') {
					const error = new Error('NoSuchKey')
					;(error as Error & { name: string }).name = 'NoSuchKey'
					throw error
				}
				return {
					Body: {
						transformToString: async () => body,
					},
				}
			}
			if (command instanceof PutObjectCommand) {
				mockState.objects.set(command.input.Key, command.input.Body)
				return {}
			}
			throw new Error(`Unexpected S3 command: ${String(command)}`)
		}
	}

	return {
		GetObjectCommand,
		ListObjectsV2Command,
		PutObjectCommand,
		S3Client,
	}
})

import { getSemanticSearchAdminStore } from '../semantic-search-admin.server.ts'

// Tests load `.env` first (override=false), so keep this test self-contained in
// case the local `.env` has placeholder values like `MOCK_R2_ENDPOINT`.
process.env.R2_BUCKET = 'mock-r2-bucket'
process.env.R2_ENDPOINT = 'https://mock.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'MOCKR2ACCESSKEYID'
process.env.R2_SECRET_ACCESS_KEY = 'MOCKR2SECRETACCESSKEY'

describe('semantic search admin store', () => {
	test('lists and reads seeded manifests', async () => {
		resetSeededObjects()
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
		resetSeededObjects()
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
							snippet: 'Hello from local R2 mock',
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
