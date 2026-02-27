import { expect, test } from 'vitest'
import { clearRuntimeEnvSource, setRuntimeEnvSource } from '../env.server.ts'
import { downloadDirList, downloadMdxFileOrDirectory } from '../github.server.ts'

function withMocksEnabled() {
	setRuntimeEnvSource({
		MOCKS: 'true',
	})
	return () => clearRuntimeEnvSource()
}

test('downloadDirList reads local content in mocks mode', async () => {
	const cleanup = withMocksEnabled()
	try {
		const list = await downloadDirList('content/blog')

		expect(list.length).toBeGreaterThan(0)
		const firstDirectory = list.find((item) => item.type === 'dir')
		expect(firstDirectory).toBeDefined()
		if (firstDirectory) {
			expect(firstDirectory.sha).toBe(firstDirectory.path)
		}
	} finally {
		cleanup()
	}
})

test('downloadMdxFileOrDirectory returns mdx files from local content', async () => {
	const cleanup = withMocksEnabled()
	try {
		const result = await downloadMdxFileOrDirectory(
			'blog/write-fewer-longer-tests',
		)

		expect(result.files.length).toBeGreaterThan(0)
		expect(result.files.some((file) => file.path.endsWith('/index.mdx'))).toBe(
			true,
		)
		expect(result.files.some((file) => file.content.length > 0)).toBe(true)
	} finally {
		cleanup()
	}
})
