import http from 'node:http'
import { describe, expect, test } from 'vitest'
import {
	getLoopbackOriginsForPort,
	resolveReachableSitemapOrigin,
} from '../../../../other/semantic-search/jsx-page-content.ts'

async function startSitemapServer(host: string) {
	const server = http.createServer((req, res) => {
		if (req.url === '/sitemap.xml') {
			res.writeHead(200, { 'Content-Type': 'application/xml' })
			res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>`)
			return
		}
		res.writeHead(404)
		res.end('not found')
	})
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, host, () => resolve())
	})
	const address = server.address()
	if (!address || typeof address === 'string') {
		throw new Error('Unexpected server address')
	}
	return {
		port: address.port,
		close: () => new Promise<void>((resolve) => server.close(() => resolve())),
	}
}

describe('jsx page dev server origin resolution', () => {
	test('getLoopbackOriginsForPort probes both IPv4 and IPv6 loopback', () => {
		expect(getLoopbackOriginsForPort(3200)).toEqual([
			'http://127.0.0.1:3200',
			'http://[::1]:3200',
		])
	})

	test('resolveReachableSitemapOrigin resolves an IPv4-only dev server', async () => {
		const server = await startSitemapServer('127.0.0.1')
		try {
			const origin = await resolveReachableSitemapOrigin({
				candidateOrigins: getLoopbackOriginsForPort(server.port),
				logs: () => '',
				timeoutMs: 5_000,
			})
			expect(origin).toBe(`http://127.0.0.1:${server.port}`)
		} finally {
			await server.close()
		}
	}, 10_000)

	// Regression for the CI failure where Vite bound to IPv6 (::1) while the
	// indexer only probed 127.0.0.1, so startup "timed out" even though the dev
	// server was already serving requests.
	test('resolveReachableSitemapOrigin resolves an IPv6-only dev server', async () => {
		let server: Awaited<ReturnType<typeof startSitemapServer>>
		try {
			server = await startSitemapServer('::1')
		} catch {
			// Skip when the runner has no IPv6 loopback available.
			return
		}
		try {
			const origin = await resolveReachableSitemapOrigin({
				candidateOrigins: getLoopbackOriginsForPort(server.port),
				logs: () => '',
				timeoutMs: 5_000,
			})
			expect(origin).toBe(`http://[::1]:${server.port}`)
		} finally {
			await server.close()
		}
	}, 10_000)

	test('resolveReachableSitemapOrigin throws with candidates and logs when unreachable', async () => {
		await expect(
			resolveReachableSitemapOrigin({
				candidateOrigins: ['http://127.0.0.1:1', 'http://[::1]:1'],
				logs: () => 'recent dev server output',
				timeoutMs: 500,
			}),
		).rejects.toThrow(/http:\/\/127\.0\.0\.1:1.*recent dev server output/s)
	}, 10_000)
})
