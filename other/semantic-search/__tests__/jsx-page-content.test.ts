import { describe, expect, test } from 'vitest'
import {
	JSX_HOME_SLUG,
	extractRenderedPageContent,
	getJsxPagePathFromSlug,
	getJsxPageSlugFromPath,
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
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/about', mdxRoutes }),
		).toBe(true)
		expect(
			shouldIndexJsxSitemapPath({ pathname: '/uses', mdxRoutes }),
		).toBe(false)
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
})
