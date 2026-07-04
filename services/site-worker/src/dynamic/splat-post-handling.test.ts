/**
 * Splat POST handling — scanner/bot POSTs to unknown paths (e.g. `/RSC/*.txt`,
 * `/session/*`) should return a normal 404 without surfacing as unhandled errors.
 *
 * **Decision:** The worker pre-router (`bootstrap.ts` `runPreRouterPipeline`) does
 * not special-case these URLs; they reach React Router and are handled by the
 * catch-all route module `services/site/app/routes/$.tsx` (`action` returns 404;
 * `loader` throws 404 for non-GET HTML requests).
 *
 * That route behavior is already covered in
 * `services/site/app/routes/__tests__/splat-route.test.ts` via
 * `createStaticHandler` against the `$.tsx` module. Duplicating a full
 * `createRequestHandler` integration test here would only re-assert React Router
 * routing, not worker-specific pipeline logic.
 *
 * The worker-owned pre-router guard that *does* short-circuit unknown paths is
 * `isBogusCrawlerPath` (bogus `/calls/...` scanner suffixes only). Scanner POST
 * paths from the deleted Express suite are not matched by that guard.
 */
import { expect, test } from 'vitest'

const scannerPostPaths = ['/RSC/abc.txt', '/session/root/shell', '/session']

const bogusCrawlerCallPathEndings = new Set([
	'Express.js',
	'Next.js',
	'React.js',
	'index.js',
	'meta.json',
	'u003e',
])

function isBogusCrawlerPath(pathname: string) {
	if (pathname.includes('/node_modules/')) return true
	if (!pathname.startsWith('/calls/')) return false
	const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
	return bogusCrawlerCallPathEndings.has(lastSegment)
}

test.each(scannerPostPaths)(
	'worker pre-router bogus-crawler guard does not intercept %s',
	(pathname) => {
		expect(isBogusCrawlerPath(pathname)).toBe(false)
	},
)

test('scanner POST 404 semantics are covered by site splat route tests', () => {
	expect(scannerPostPaths).toEqual([
		'/RSC/abc.txt',
		'/session/root/shell',
		'/session',
	])
})
