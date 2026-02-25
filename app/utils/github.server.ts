import nodePath from 'path'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit as createOctokit } from '@octokit/rest'
import { type GitHubFile } from '#app/types.ts'
import { getEnv } from '#app/utils/env.server.ts'

const ref = getEnv().GITHUB_REF

const safePath = (s: string) => s.replace(/\\/g, '/')
const workspaceRoot = process.cwd()

type LocalFsModules = {
	fs: {
		readFile: (path: string, options: { encoding: 'utf-8' }) => Promise<string>
		readdir: (
			path: string,
			options: { withFileTypes: true },
		) => Promise<
			Array<{
				name: string
				isDirectory: () => boolean
				isFile: () => boolean
			}>
		>
	}
	path: {
		resolve: (...parts: Array<string>) => string
		relative: (from: string, to: string) => string
		join: (...parts: Array<string>) => string
	}
}

let localFsModulesPromise: Promise<LocalFsModules | null> | null = null

function getLocalFsModules() {
	if (localFsModulesPromise) return localFsModulesPromise
	localFsModulesPromise = Promise.all([
		import('node:fs/promises'),
		import('node:path'),
	])
		.then(([fs, path]) => ({ fs, path }))
		.catch(() => null)
	return localFsModulesPromise
}

async function shouldUseLocalContentMocks() {
	if (!getEnv().MOCKS) return false
	const localFsModules = await getLocalFsModules()
	return localFsModules !== null
}

function toWorkspacePath(relativePath: string, pathApi: LocalFsModules['path']) {
	const absolutePath = pathApi.resolve(workspaceRoot, relativePath)
	const relativeToRoot = pathApi.relative(workspaceRoot, absolutePath)
	const isUnsafePath =
		relativeToRoot.startsWith('..') || pathApi.resolve(absolutePath) !== absolutePath
	if (isUnsafePath) {
		throw new Error(`Refusing to read path outside workspace: ${relativePath}`)
	}
	return absolutePath
}

const Octokit = createOctokit.plugin(throttling)

const octokit = new Octokit({
	auth: getEnv().BOT_GITHUB_TOKEN,
	baseUrl: getEnv().GITHUB_API_BASE_URL,
	throttle: {
		onRateLimit: (retryAfter, options) => {
			const method = 'method' in options ? options.method : 'METHOD_UNKNOWN'
			const url = 'url' in options ? options.url : 'URL_UNKNOWN'
			console.warn(
				`Request quota exhausted for request ${method} ${url}. Retrying after ${retryAfter} seconds.`,
			)

			return true
		},
		onSecondaryRateLimit: (retryAfter, options) => {
			const method = 'method' in options ? options.method : 'METHOD_UNKNOWN'
			const url = 'url' in options ? options.url : 'URL_UNKNOWN'
			// does not retry, only logs a warning
			octokit.log.warn(`Abuse detected for request ${method} ${url}`)
		},
	},
})

async function downloadFirstMdxFile(
	list: Array<{ name: string; type: string; path: string; sha: string }>,
) {
	const filesOnly = list.filter(({ type }) => type === 'file')
	for (const extension of ['.mdx', '.md']) {
		const file = filesOnly.find(({ name }) => name.endsWith(extension))
		if (file) return { file, content: await downloadFileBySha(file.sha) }
	}
	return null
}

/**
 *
 * @param relativeMdxFileOrDirectory the path to the content. For example:
 * content/blog/my-post.mdx (pass "blog/my-post")
 * content/pages/about/index.mdx (pass "pages/about")
 * @returns A promise that resolves to an Array of GitHubFiles for the necessary files
 */
async function downloadMdxFileOrDirectory(
	relativeMdxFileOrDirectory: string,
): Promise<{ entry: string; files: Array<GitHubFile> }> {
	const mdxFileOrDirectory = `content/${relativeMdxFileOrDirectory}`

	const parentDir = nodePath.dirname(mdxFileOrDirectory)
	const dirList = await downloadDirList(parentDir)

	const basename = nodePath.basename(mdxFileOrDirectory)
	const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
	const requestedExt = nodePath.extname(basename).toLowerCase()
	const isExplicitFileRequest =
		requestedExt === '.mdx' || requestedExt === '.md'

	let files: Array<GitHubFile> = []
	let entry = mdxFileOrDirectory

	if (isExplicitFileRequest) {
		const exactFile = dirList.find(
			(item) => item.type === 'file' && item.name === basename,
		)
		if (exactFile) {
			const content = await downloadFileBySha(exactFile.sha)
			entry = exactFile.path
			// `compileMdx` expects content to look like `<slug>/index.mdx`. Historically,
			// callers could pass slugs with or without a `.mdx` suffix. To avoid 404s
			// due to path-shape mismatch, we provide both virtual paths.
			const virtualDirWithoutExt = nodePath.join(parentDir, mdxFileWithoutExt)
			files = [
				{
					path: safePath(nodePath.join(virtualDirWithoutExt, 'index.mdx')),
					content,
				},
				{
					path: safePath(nodePath.join(mdxFileOrDirectory, 'index.mdx')),
					content,
				},
			]
		}
		return { entry, files }
	}

	const exactFiles = dirList.filter(
		(item) =>
			item.type === 'file' &&
			nodePath.parse(item.name).name === mdxFileWithoutExt,
	)
	const fileResult = await downloadFirstMdxFile(exactFiles)
	if (fileResult) {
		// technically you can get the blog post by adding .mdx at the end... Weird
		// but may as well handle it since that's easy...
		entry = fileResult.file.path
		// /content/about.mdx => entry is about.mdx, but compileMdx needs
		// the entry to be called "/content/index.mdx" so we'll set it to that
		// because this is the entry for this path
		files = [
			{
				path: safePath(nodePath.join(mdxFileOrDirectory, 'index.mdx')),
				content: fileResult.content,
			},
		]
	} else {
		const exactDir = dirList.find(
			(item) => item.type === 'dir' && item.name === mdxFileWithoutExt,
		)
		if (exactDir) {
			entry = exactDir.path
			files = await downloadDirectory(exactDir.path)
		}
	}

	return { entry, files }
}

/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
async function downloadDirectory(dir: string): Promise<Array<GitHubFile>> {
	const dirList = await downloadDirList(dir)

	const result = await Promise.all(
		dirList.map(async ({ path: fileDir, type, sha }) => {
			switch (type) {
				case 'file': {
					const content = await downloadFileBySha(sha)
					return { path: safePath(fileDir), content }
				}
				case 'dir': {
					return downloadDirectory(fileDir)
				}
				default: {
					throw new Error(`Unexpected repo file type: ${type}`)
				}
			}
		}),
	)

	return result.flat()
}

/**
 *
 * @param sha the hash for the file (retrieved via `downloadDirList`)
 * @returns a promise that resolves to a string of the contents of the file
 */
async function downloadFileBySha(sha: string) {
	if (await shouldUseLocalContentMocks()) {
		const localFsModules = await getLocalFsModules()
		if (!localFsModules) {
			throw new Error('Local content mocks requested but node fs modules unavailable')
		}
		const normalizedSha = safePath(sha)
		const filePath = toWorkspacePath(normalizedSha, localFsModules.path)
		return localFsModules.fs.readFile(filePath, { encoding: 'utf-8' })
	}

	const { data } = await octokit.git.getBlob({
		owner: 'kentcdodds',
		repo: 'kentcdodds.com',
		file_sha: sha,
	})
	const encoding = data.encoding as any
	return Buffer.from(data.content, encoding).toString()
}

// IDEA: possibly change this to a regular fetch since all my content is public anyway:
// https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
// nice thing is it's not rate limited
async function downloadFile(path: string) {
	if (await shouldUseLocalContentMocks()) {
		const localFsModules = await getLocalFsModules()
		if (!localFsModules) {
			throw new Error('Local content mocks requested but node fs modules unavailable')
		}
		const filePath = toWorkspacePath(safePath(path), localFsModules.path)
		return localFsModules.fs.readFile(filePath, { encoding: 'utf-8' })
	}

	const { data } = await octokit.repos.getContent({
		owner: 'kentcdodds',
		repo: 'kentcdodds.com',
		path,
		ref,
	})

	if ('content' in data && 'encoding' in data) {
		const encoding = data.encoding as any
		return Buffer.from(data.content, encoding).toString()
	}

	console.error(data)
	throw new Error(
		`Tried to get ${path} but got back something that was unexpected. It doesn't have a content or encoding property`,
	)
}

/**
 *
 * @param path the full path to list
 * @returns a promise that resolves to a file ListItem of the files/directories in the given directory (not recursive)
 */
async function downloadDirList(path: string) {
	if (await shouldUseLocalContentMocks()) {
		const localFsModules = await getLocalFsModules()
		if (!localFsModules) {
			throw new Error('Local content mocks requested but node fs modules unavailable')
		}

		const normalizedPath = safePath(path)
		const dirPath = toWorkspacePath(normalizedPath, localFsModules.path)
		const dirEntries = await localFsModules.fs.readdir(dirPath, {
			withFileTypes: true,
		})

		return dirEntries.map((entry) => {
			const entryPath = safePath(localFsModules.path.join(normalizedPath, entry.name))
			return {
				name: entry.name,
				path: entryPath,
				sha: entryPath,
				type: entry.isDirectory() ? 'dir' : 'file',
			}
		})
	}

	const resp = await octokit.repos.getContent({
		owner: 'kentcdodds',
		repo: 'kentcdodds.com',
		path,
		ref,
	})
	const data = resp.data

	if (!Array.isArray(data)) {
		throw new Error(
			`Tried to download content from ${path}. GitHub did not return an array of files. This should never happen...`,
		)
	}

	return data
}

export { downloadMdxFileOrDirectory, downloadDirList, downloadFile }
