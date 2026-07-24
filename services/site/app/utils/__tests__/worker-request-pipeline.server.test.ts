import React from 'react'
import {
	createRequestHandler,
	Outlet,
	type EntryContext,
	type ServerBuild,
} from 'react-router'
import { expect, test, vi } from 'vitest'
import {
	createWorkerFetchHandler,
	isMalformedRequestPath,
} from '../worker-request-pipeline.server.ts'

function createTestExecutionContext() {
	return {
		waitUntil() {},
		passThroughOnException() {},
		props: {},
		exports: {},
	} as unknown as Parameters<
		ReturnType<typeof createWorkerFetchHandler>['fetch']
	>[2]
}

function createMinimalSplatServerBuild(): ServerBuild {
	function Root() {
		return React.createElement(
			'html',
			null,
			React.createElement('body', null, React.createElement(Outlet)),
		)
	}
	function Splat() {
		return React.createElement('div', null, 'splat')
	}

	return {
		entry: {
			module: {
				default: async (
					request: Request,
					responseStatusCode: number,
					responseHeaders: Headers,
					routerContext: EntryContext,
				) => {
					const { ServerRouter } = await import('react-router')
					const { renderToReadableStream } = await import('react-dom/server')
					const stream = await renderToReadableStream(
						React.createElement(ServerRouter, {
							context: routerContext,
							url: request.url,
						}),
					)
					const text = await new Response(stream).text()
					return new Response(text, {
						status: responseStatusCode,
						headers: responseHeaders,
					})
				},
			},
		},
		routes: {
			root: {
				id: 'root',
				path: '',
				module: { default: Root },
				children: [{ id: 'routes/$', path: '*', module: { default: Splat } }],
			},
			'routes/$': {
				id: 'routes/$',
				parentId: 'root',
				path: '*',
				module: { default: Splat },
			},
		},
		assets: {
			entry: { imports: [], module: '/entry.js' },
			routes: {
				root: {
					id: 'root',
					path: '',
					imports: [],
					module: '/root.js',
					hasAction: false,
					hasLoader: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasErrorBoundary: false,
				},
				'routes/$': {
					id: 'routes/$',
					parentId: 'root',
					path: '*',
					imports: [],
					module: '/splat.js',
					hasAction: false,
					hasLoader: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasErrorBoundary: false,
				},
			},
			url: '/manifest.js',
			version: '1',
		},
		publicPath: '/',
		basename: '/',
		future: {},
		isSpaMode: false,
		prerender: [],
		ssr: true,
		routeDiscovery: { mode: 'lazy', manifestPath: '/__manifest' },
	} as unknown as ServerBuild
}

test.each([
	['/%5C', true],
	['/%5c', true],
	['//%5C', true],
	['/%5Cfoo', true],
	['/%5C%5C', true],
	['/foo%5Cbar', true],
	['/\\', true],
	['/%', true],
	['/', false],
	['/blog', false],
	['/foo%2Fbar', false],
] as const)('isMalformedRequestPath(%j) → %s', (pathname, expected) => {
	expect(isMalformedRequestPath(pathname)).toBe(expected)
})

test('react-router SSR throws Invalid URL for /%5C when a splat matches', async () => {
	const handler = createRequestHandler(
		createMinimalSplatServerBuild(),
		'production',
	)
	const response = await handler(new Request('https://kentcdodds.com/%5C'))
	expect(response.status).toBe(500)
	expect(await response.text()).toMatch(/Unexpected Server Error|Internal/i)
})

// Raw `/\` cannot round-trip through `new Request`/`URL` (Node normalizes `\`
// to `/`); production scanners hit the percent-encoded forms below.
test.each(['/%5C', '//%5C', '/%5Cfoo', '/%5C%5C', '/foo%5Cbar', '/%5c'])(
	'worker pipeline returns 400 for malformed path %s without hitting the router',
	async (pathname) => {
		const getServerBuild = vi.fn(async () => createMinimalSplatServerBuild())
		const handler = createWorkerFetchHandler({
			redirectsText: '',
			ensureRuntimeBridges: async () => {},
			getServerBuild,
			requestHandlerMode: 'production',
			errorLogLabel: 'test-malformed-path',
		})

		const response = await handler.fetch(
			new Request(`https://kentcdodds.com${pathname}`),
			{},
			createTestExecutionContext(),
		)

		expect(response.status).toBe(400)
		expect(await response.text()).toBe('Bad Request')
		expect(getServerBuild).not.toHaveBeenCalled()
	},
)

test('worker pipeline still reaches the router for a normal path', async () => {
	const getServerBuild = vi.fn(async () => createMinimalSplatServerBuild())
	const handler = createWorkerFetchHandler({
		redirectsText: '',
		ensureRuntimeBridges: async () => {},
		getServerBuild,
		requestHandlerMode: 'production',
		errorLogLabel: 'test-malformed-path',
	})

	const response = await handler.fetch(
		new Request('https://kentcdodds.com/blog'),
		{},
		createTestExecutionContext(),
	)

	expect(getServerBuild).toHaveBeenCalledOnce()
	expect(response.status).toBe(200)
	expect(await response.text()).toContain('splat')
})
