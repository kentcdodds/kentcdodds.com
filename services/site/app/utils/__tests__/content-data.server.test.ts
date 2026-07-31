import { afterEach, describe, expect, test, vi } from 'vitest'

const getContentData = vi.hoisted(() => vi.fn())
const getArtifactDataFile = vi.hoisted(() => vi.fn())

vi.mock('#app/utils/content-artifacts.server.ts', () => ({
	getContentData,
	getArtifactDataFile,
}))

import { getContentDataCacheKey } from '../content-data.server.ts'

describe('getContentDataCacheKey', () => {
	afterEach(() => {
		getContentData.mockReset()
		getArtifactDataFile.mockReset()
	})

	test('uses the unversioned key when artifacts are unavailable', () => {
		getContentData.mockReturnValue(null)
		expect(getContentDataCacheKey('talks.yml')).toBe('content:data:talks.yml')
	})

	test('scopes the key to the artifact content version', () => {
		getContentData.mockReturnValue({ version: 'bundle-v2' })
		expect(getContentDataCacheKey('talks.yml')).toBe(
			'content:data:talks.yml:bundle-v2',
		)
	})
})
