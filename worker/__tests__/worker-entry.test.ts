import { expect, test, vi } from 'vitest'
import worker from '../index.ts'

test('health endpoint applies worker security headers', async () => {
	const request = new Request('https://preview.example.com/health', {
		headers: { Host: 'preview.example.com' },
	})

	const response = await worker.fetch(request, {}, {})
	const payload = (await response.json()) as {
		ok?: boolean
		runtime?: string
	}

	expect(response.status).toBe(200)
	expect(payload).toEqual({ ok: true, runtime: 'cloudflare-worker' })
	expect(response.headers.get('X-Powered-By')).toBe('Kody the Koala')
	expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
	expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
	expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
		'https://preview.example.com',
	)
	expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=')
})

test('http requests are redirected to https', async () => {
	const request = new Request('http://preview.kentcdodds.com/any-path?x=1', {
		headers: {
			Host: 'preview.kentcdodds.com',
			'X-Forwarded-Proto': 'http',
		},
	})

	const response = await worker.fetch(request, {}, {})

	expect(response.status).toBe(301)
	expect(response.headers.get('Location')).toBe(
		'https://preview.kentcdodds.com/any-path?x=1',
	)
})

test('mcp requests are forwarded to durable object binding', async () => {
	const durableFetch = vi.fn(async () => {
		return new Response('mcp-forwarded', { status: 202 })
	})
	const durableNamespace = {
		idFromName(name: string) {
			return `id:${name}`
		},
		get(_id: unknown) {
			return {
				fetch: durableFetch,
			}
		},
	}

	const request = new Request('https://kentcdodds.com/mcp', {
		method: 'POST',
		headers: {
			Host: 'kentcdodds.com',
		},
	})
	const response = await worker.fetch(
		request,
		{ MCP_OBJECT: durableNamespace },
		{},
	)

	expect(durableFetch).toHaveBeenCalledTimes(1)
	expect(response.status).toBe(202)
	expect(await response.text()).toBe('mcp-forwarded')
	expect(response.headers.get('X-Powered-By')).toBe('Kody the Koala')
})
