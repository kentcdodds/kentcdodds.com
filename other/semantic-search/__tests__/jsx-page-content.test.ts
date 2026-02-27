import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import {
	JSX_HOME_SLUG,
	extractRenderedPageContent,
	getMdxPageRoutes,
	getJsxPagePathFromSlug,
	getJsxPageSlugFromPath,
	loadJsxPageItemsFromRunningSite,
	parseSitemapPathnames,
	shouldIndexJsxSitemapPath,
} from '../jsx-page-content.ts'

describe('jsx page content utils', () => {
	test('parseSitemapPathnames extracts and normalizes loc entries', () => {
		const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset>
        <url><loc>https://kentcdodds.com/about</loc></url>
        <url><loc>https://kentcdodds.com/about/</loc></url>
        <url><loc>https://kentcdodds.com/blog?source=sitemap</loc></url>
        <url><loc>/search</loc></url>
      </urlset>
    `
		expect(parseSitemapPathnames(xml)).toEqual(['/about', '/blog', '/search'])
	})

	test('shouldIndexJsxSitemapPath excludes non-jsx and already-indexed routes', () => {
		const mdxRoutes = new Set(['/uses', '/appearances'])
		expect(shouldIndexJsxSitemapPath({ pathname: '/about', mdxRoutes })).toBe(
			true,
		)
		// SKIPPED_PREFIX_ROUTES uses '/blog/' so bare '/blog' remains indexable.
		expect(shouldIndexJsxSitemapPath({ pathname: '/blog', mdxRoutes })).toBe(
			true,
		)
		expect(shouldIndexJsxSitemapPath({ pathname: '/uses', mdxRoutes })).toBe(
			false,
		)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/blog/test-post', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/talks/react', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/calls/season-1', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/chats/episode-1', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/sitemap.xml', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/feed.json', mdxRoutes }),
		).toBe(false)
		expect(shouldIndexJsxSitemapPath({ pathname: '/login', mdxRoutes })).toBe(
			false,
		)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/me/password', mdxRoutes }),
		).toBe(false)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/me/passkeys', mdxRoutes }),
		).toBe(false)
		expect(shouldIndexJsxSitemapPath({ pathname: '/me', mdxRoutes })).toBe(
			false,
		)
	})

	test('getJsxPageSlugFromPath and getJsxPagePathFromSlug are reversible', () => {
		expect(getJsxPageSlugFromPath('/')).toBe(JSX_HOME_SLUG)
		expect(getJsxPagePathFromSlug(JSX_HOME_SLUG)).toBe('/')
		expect(getJsxPageSlugFromPath('/workshops')).toBe('workshops')
		expect(getJsxPagePathFromSlug('workshops')).toBe('/workshops')
	})

	test('extractRenderedPageContent removes nav/footer/script noise', () => {
		const html = `
      <html>
        <head>
          <title>About Kent</title>
          <script>window.foo = "bar"</script>
        </head>
        <body>
          <nav>
            Home Blog Search
          </nav>
          <section>
            <h1>About Kent</h1>
            <p>Kent writes and teaches about quality software.</p>
          </section>
          <main>
            <h2>Main content</h2>
            <p>This should stay in the extracted page content.</p>
          </main>
          <footer>
            Footer links and legal.
          </footer>
        </body>
      </html>
    `

		const extracted = extractRenderedPageContent(html)
		expect(extracted.title).toBe('About Kent')
		expect(extracted.text).toContain('About Kent')
		expect(extracted.text).toContain('Main content')
		expect(extracted.text).not.toContain('Home Blog Search')
		expect(extracted.text).not.toContain('Footer links and legal')
		expect(extracted.text).not.toContain('window.foo')
	})

	test('extractRenderedPageContent keeps block sections newline separated', () => {
		const html = `
      <html>
        <head><title>Courses</title></head>
        <body>
          <main>
            <h1>Level up as a developer.</h1>
            <h2>Invest in yourself with a premium dev course.</h2>
            <h3>Reasons to invest in yourself</h3>
            <h4>Become a more confident developer</h4>
          </main>
        </body>
      </html>
    `

		const extracted = extractRenderedPageContent(html)
		expect(extracted.text).toContain(
			[
				'Level up as a developer.',
				'Invest in yourself with a premium dev course.',
				'Reasons to invest in yourself',
				'Become a more confident developer',
			].join('\n'),
		)
	})

	test('extractRenderedPageContent excludes aria-hidden content', () => {
		const html = `
      <html>
        <head><title>Hidden bits</title></head>
        <body>
          <main>
            <h1>Visible heading</h1>
            <p aria-hidden="true">This text should be excluded</p>
            <p aria-hidden="TRUE">Also excluded text</p>
            <p>This should remain visible.</p>
          </main>
        </body>
      </html>
    `

		const extracted = extractRenderedPageContent(html)
		expect(extracted.text).toContain('Visible heading')
		expect(extracted.text).toContain('This should remain visible.')
		expect(extracted.text).not.toContain('This text should be excluded')
		expect(extracted.text).not.toContain('Also excluded text')
	})

	test(
		'getMdxPageRoutes discovers nested mdx files and index routes',
		async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jsx-page-routes-'))
		try {
			await fs.mkdir(path.join(root, 'content', 'pages', 'nested', 'deep'), {
				recursive: true,
			})
			await fs.writeFile(
				path.join(root, 'content', 'pages', 'top-level.mdx'),
				'# Top level',
				'utf8',
			)
			await fs.writeFile(
				path.join(root, 'content', 'pages', 'nested', 'child-page.mdx'),
				'# Child page',
				'utf8',
			)
			await fs.writeFile(
				path.join(root, 'content', 'pages', 'nested', 'deep', 'leaf-page.mdx'),
				'# Leaf page',
				'utf8',
			)
			await fs.mkdir(path.join(root, 'content', 'pages', 'using-index'), {
				recursive: true,
			})
			await fs.writeFile(
				path.join(root, 'content', 'pages', 'using-index', 'index.mdx'),
				'# Using index',
				'utf8',
			)
			await fs.writeFile(
				path.join(root, 'content', 'pages', 'nested', 'deep', 'ignore.txt'),
				'ignore me',
				'utf8',
			)

			const routes = await getMdxPageRoutes(root)
			expect([...routes].sort()).toEqual([
				'/nested/child-page',
				'/nested/deep/leaf-page',
				'/top-level',
				'/using-index',
			])
		} finally {
			await fs.rm(root, { recursive: true, force: true })
		}
		},
	)

	test('loadJsxPageItemsFromRunningSite follows one same-origin redirect', async () => {
		const server = http.createServer((req, res) => {
			const host = req.headers.host ?? '127.0.0.1'
			if (req.url === '/sitemap.xml') {
				res.writeHead(200, { 'Content-Type': 'application/xml' })
				res.end(
					`<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>http://${host}/about</loc></url></urlset>`,
				)
				return
			}
			if (req.url === '/about') {
				res.writeHead(302, { Location: '/about/' })
				res.end()
				return
			}
			if (req.url === '/about/') {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
				res.end(`
          <html>
            <head><title>About Redirected</title></head>
            <body><main><h1>About Content</h1><p>Redirect target page content.</p></main></body>
          </html>
        `)
				return
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' })
			res.end('not found')
		})

		try {
			await new Promise<void>((resolve) =>
				server.listen(0, '127.0.0.1', () => resolve()),
			)
			const address = server.address()
			if (!address || typeof address === 'string') {
				throw new Error('Unexpected server address')
			}
			const origin = `http://127.0.0.1:${address.port}`
			const items = await loadJsxPageItemsFromRunningSite({
				origin,
				mdxRoutes: new Set(),
				minimumTextLength: 1,
			})

			expect(items).toHaveLength(1)
			expect(items[0]?.url).toBe('/about')
			expect(items[0]?.title).toBe('About Redirected')
			expect(items[0]?.source).toContain('Redirect target page content.')
		} finally {
			await new Promise<void>((resolve) => server.close(() => resolve()))
		}
	}, 10_000)
})
