import fs from 'node:fs/promises'
import path from 'node:path'
import { type Request, type RequestHandler } from 'express'

type MdxRouteInfo = { contentDir: 'blog' | 'pages'; slug: string }

const MARKDOWN_MIME = 'text/markdown'
const validSlugRegex = /^[a-zA-Z0-9-_.]+$/

function requestAcceptsMarkdown(req: Request): boolean {
	const accept = req.get('accept')
	return Boolean(accept && accept.toLowerCase().includes(MARKDOWN_MIME))
}

function isValidSlug(slug: string): boolean {
	return validSlugRegex.test(slug)
}

function getMdxRouteInfoFromPath(pathname: string): MdxRouteInfo | null {
	const blogMatch = pathname.match(/^\/blog\/([^/]+)$/)
	if (blogMatch?.[1] && isValidSlug(blogMatch[1])) {
		return { contentDir: 'blog', slug: blogMatch[1] }
	}

	const pageMatch = pathname.match(/^\/([^/]+)$/)
	if (pageMatch?.[1] && pageMatch[1] !== 'blog' && isValidSlug(pageMatch[1])) {
		return { contentDir: 'pages', slug: pageMatch[1] }
	}

	return null
}

function isPathInside(parentDir: string, candidatePath: string): boolean {
	const relative = path.relative(parentDir, candidatePath)
	return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
}

async function readMarkdownSourceFromDisk(
	routeInfo: MdxRouteInfo,
): Promise<string | null> {
	const baseDir = path.resolve(process.cwd(), 'content', routeInfo.contentDir)

	const candidates: Array<string> = []
	if (routeInfo.slug.endsWith('.mdx') || routeInfo.slug.endsWith('.md')) {
		candidates.push(path.join(baseDir, routeInfo.slug))
	} else {
		candidates.push(path.join(baseDir, `${routeInfo.slug}.mdx`))
		candidates.push(path.join(baseDir, `${routeInfo.slug}.md`))
	}
	candidates.push(path.join(baseDir, routeInfo.slug, 'index.mdx'))
	candidates.push(path.join(baseDir, routeInfo.slug, 'index.md'))

	for (const candidate of candidates) {
		const resolvedCandidate = path.resolve(candidate)
		if (!isPathInside(baseDir, resolvedCandidate)) continue

		try {
			return await fs.readFile(resolvedCandidate, 'utf8')
		} catch (error: unknown) {
			// Try the next candidate on "not found" / "not a directory" errors.
			if (typeof error === 'object' && error && 'code' in error) {
				const code = String((error as any).code)
				if (code === 'ENOENT' || code === 'ENOTDIR') continue
			}
			throw error
		}
	}

	return null
}

const markdownAcceptMiddleware: RequestHandler = (req, res, next) => {
	if (req.method !== 'GET' && req.method !== 'HEAD') return next()
	if (!requestAcceptsMarkdown(req)) return next()

	const routeInfo = getMdxRouteInfoFromPath(req.path)
	if (!routeInfo) return next()

	void (async () => {
		const markdownSource = await readMarkdownSourceFromDisk(routeInfo)
		if (markdownSource === null) return next()

		res.status(200)
		res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
		// Ensure caches don't mix the HTML and markdown representations.
		res.append('Vary', 'Accept')
		// Keep parity with the existing MDX page loaders' caching behavior.
		res.append('Vary', 'Cookie')
		res.setHeader('Cache-Control', 'private, max-age=3600')

		if (req.method === 'HEAD') return void res.end()
		res.send(markdownSource)
	})().catch((error) => {
		console.error('Failed to read markdown source.', error)
		next()
	})
}

export { markdownAcceptMiddleware }

