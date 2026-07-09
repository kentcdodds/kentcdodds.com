import { expect, test } from 'vitest'
import { isBogusCrawlerPath } from '../../../site/app/utils/worker-request-pipeline.server.ts'

const scannerPostPaths = ['/RSC/abc.txt', '/session/root/shell', '/session']

test.each(scannerPostPaths)(
	'does not treat scanner POST paths as bogus crawler paths: %s',
	(pathname) => {
		expect(isBogusCrawlerPath(pathname)).toBe(false)
	},
)

test('flags bogus /calls/ scanner suffixes', () => {
	expect(isBogusCrawlerPath('/calls/record/Express.js')).toBe(true)
	expect(isBogusCrawlerPath('/calls/record/meta.json')).toBe(true)
})

test('flags /node_modules/ paths', () => {
	expect(isBogusCrawlerPath('/node_modules/foo/bar.js')).toBe(true)
})
