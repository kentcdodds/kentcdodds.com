import { promises as fs } from 'fs'
import * as nodePath from 'path'
import { fileURLToPath } from 'url'
import {
	http,
	type DefaultRequestMultipartBody,
	type HttpHandler,
	HttpResponse,
} from 'msw'

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))

async function isDirectory(d: string) {
	try {
		return (await fs.lstat(d)).isDirectory()
	} catch {
		return false
	}
}
async function isFile(d: string) {
	try {
		return (await fs.lstat(d)).isFile()
	} catch {
		return false
	}
}

type GHContentsDescription = {
	name: string
	path: string
	sha: string
	size: number
	url: string
	html_url: string
	git_url: string
	download_url: string | null
	type: 'dir' | 'file'
	_links: {
		self: string
		git: string
		html: string
	}
}

type GHContent = {
	sha: string
	node_id: string
	size: number
	url: string
	content: string
	encoding: 'base64'
}

const githubHandlers: Array<HttpHandler> = [
	http.get<any, DefaultRequestMultipartBody>(
		`https://api.github.com/repos/:owner/:repo/contents/:path`,
		async ({ request, params }) => {
			const url = new URL(request.url)
			const { owner, repo } = params
			if (typeof params.path !== 'string') {
				throw new Error('req.params.path must be a string')
			}
			const path = decodeURIComponent(params.path).trim()
			const isMockable =
				owner === 'kentcdodds' &&
				repo === 'kentcdodds.com' &&
				path.startsWith('content')

			if (!isMockable) {
				const message = `Attempting to get content description for unmockable resource: ${owner}/${repo}/${path}`
				console.error(message)
				throw new Error(message)
			}

			const localPath = nodePath.join(__dirname, '..', path)
			const isLocalDir = await isDirectory(localPath)
			const isLocalFile = await isFile(localPath)

			if (!isLocalDir && !isLocalFile) {
				return HttpResponse.json(
					{
						message: 'Not Found',
						documentation_url:
							'https://docs.github.com/rest/reference/repos#get-repository-content',
					},
					{ status: 404 },
				)
			}

			if (isLocalFile) {
				const encoding = 'base64' as const
				const content = await fs.readFile(localPath, { encoding: 'utf-8' })
				return HttpResponse.json(
					{
						content: Buffer.from(content, 'utf-8').toString(encoding),
						encoding,
					},
					{ status: 200 },
				)
			}

			const dirList = await fs.readdir(localPath)

			const contentDescriptions = await Promise.all(
				dirList.map(async (name): Promise<GHContentsDescription> => {
					const relativePath = nodePath.join(path, name)
					// NOTE: this is a cheat-code so we don't have to determine the sha of the file
					// and our sha endpoint handler doesn't have to do a reverse-lookup.
					const sha = relativePath
					const fullPath = nodePath.join(localPath, name)
					const isDir = await isDirectory(fullPath)
					const size = isDir ? 0 : (await fs.stat(fullPath)).size
					return {
						name,
						path: relativePath,
						sha,
						size,
						url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}?${url.searchParams}`,
						html_url: `https://github.com/${owner}/${repo}/tree/main/${path}`,
						git_url: `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}`,
						download_url: null,
						type: isDir ? 'dir' : 'file',
						_links: {
							self: `https://api.github.com/repos/${owner}/${repo}/contents/${path}${url.searchParams}`,
							git: `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}`,
							html: `https://github.com/${owner}/${repo}/tree/main/${path}`,
						},
					}
				}),
			)

			return HttpResponse.json(contentDescriptions)
		},
	),
	http.get<any, DefaultRequestMultipartBody>(
		`https://api.github.com/repos/:owner/:repo/git/blobs/:sha`,
		async ({ params }) => {
			const { owner, repo } = params
			if (typeof params.sha !== 'string') {
				throw new Error('req.params.sha must be a string')
			}
			const sha = decodeURIComponent(params.sha).trim().replace(/\\/g, '/')
			// if the sha includes a "/" that means it's not a sha but a relativePath
			// and therefore the client is getting content it got from the local
			// mock environment, not the actual github API.
			if (!sha.includes('/')) {
				const message = `Attempting to get content for sha, but no sha exists locally: ${sha}`
				console.error(message)
				throw new Error(message)
			}

			// NOTE: we cheat a bit and in the contents/:path handler, we set the sha to the relativePath
			const relativePath = sha
			const fullPath = nodePath.join(__dirname, '..', relativePath)
			const encoding = 'base64' as const
			const size = (await fs.stat(fullPath)).size
			const content = await fs.readFile(fullPath, { encoding: 'utf-8' })

			const resource: GHContent = {
				sha,
				node_id: `${sha}_node_id`,
				size,
				url: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
				content: Buffer.from(content, 'utf-8').toString(encoding),
				encoding,
			}

			return HttpResponse.json(resource)
		},
	),
	http.get<any, DefaultRequestMultipartBody>(
		`https://api.github.com/repos/:owner/:repo/contents/:path*`,
		async ({ params }) => {
			const { owner, repo } = params

			const relativePath = params.path
			if (typeof relativePath !== 'string') {
				throw new Error('req.params.path must be a string')
			}
			const fullPath = nodePath.join(__dirname, '..', relativePath)
			const encoding = 'base64' as const
			const size = (await fs.stat(fullPath)).size
			const content = await fs.readFile(fullPath, { encoding: 'utf-8' })
			const sha = `${relativePath}_sha`

			const resource: GHContent = {
				sha,
				node_id: `${params.path}_node_id`,
				size,
				url: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
				content: Buffer.from(content, 'utf-8').toString(encoding),
				encoding,
			}

			return HttpResponse.json(resource)
		},
	),
]

export { githubHandlers }
