import type { Request, RequestHandler } from 'express'
import { downloadMdxFilesCached } from '../app/utils/mdx.server.ts'

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

function findMdxIndexFileContent(
	files: Array<{ path: string; content: string }>,
	slug: string,
): string | null {
	// Mirrors the `compileMdx` index-file selection, but without regex pitfalls
	// when slugs contain "." or other special chars.
	for (const ext of ['mdx', 'md'] as const) {
		const suffix = `${slug}/index.${ext}`
		const found = files.find((f) => f.path.replace(/\\/g, '/').endsWith(suffix))
		if (found) return found.content
	}
	return null
}

const markdownAcceptMiddleware: RequestHandler = (req, res, next) => {
	if (req.method !== 'GET' && req.method !== 'HEAD') return next()
	if (!requestAcceptsMarkdown(req)) return next()

	const routeInfo = getMdxRouteInfoFromPath(req.path)
	if (!routeInfo) return next()

	void (async () => {
		const downloaded = await downloadMdxFilesCached(
			routeInfo.contentDir,
			routeInfo.slug,
			{},
		)
		if (!downloaded.files.length) return next()

		const markdownSource = findMdxIndexFileContent(
			downloaded.files,
			routeInfo.slug,
		)
		if (!markdownSource) return next()

		res.status(200)
		res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
		// Ensure caches don't mix the HTML and markdown representations.
		res.append('Vary', 'Accept')
		// Keep parity with the existing MDX page loaders' caching behavior.
		res.append('Vary', 'Cookie')
		res.setHeader('Cache-Control', 'private, max-age=3600')

		if (req.method === 'HEAD') return void res.end()
		res.send(markdownSource)
	})().catch(() => next())
}

export { markdownAcceptMiddleware }

