// @vitest-environment node
import { createRequestHandler, type ServerBuild } from 'react-router'
import { expect, test, vi } from 'vitest'
import * as catchAllRoute from '../../app/routes/$.tsx'

vi.mock('#app/components/arrow-button.tsx', () => ({
	ArrowLink: () => null,
}))
vi.mock('#app/components/error-boundary.tsx', () => ({
	GeneralErrorBoundary: () => null,
}))
vi.mock('#app/components/errors.tsx', () => ({
	ErrorPage: () => null,
	FourOhFour: () => null,
}))
vi.mock('#app/components/kifs.tsx', () => ({
	Facepalm: () => null,
}))
vi.mock('#app/utils/not-found-suggestions.server.ts', () => ({
	getNotFoundSuggestions: async () => null,
}))

function createSplatBuild({
	handleError,
}: {
	handleError: NonNullable<ServerBuild['entry']['module']['handleError']>
}): ServerBuild {
	return {
		assets: {
			entry: { imports: [], module: '/entry.js' },
			routes: {
				root: {
					id: 'root',
					path: '',
					module: '/root.js',
					hasAction: false,
					hasLoader: false,
					hasClientAction: false,
					hasClientLoader: false,
					hasClientMiddleware: false,
					hasErrorBoundary: true,
					clientActionModule: undefined,
					clientLoaderModule: undefined,
					clientMiddlewareModule: undefined,
					hydrateFallbackModule: undefined,
				},
				'routes/$': {
					id: 'routes/$',
					parentId: 'root',
					path: '*',
					module: '/routes/$.js',
					hasAction: true,
					hasLoader: true,
					hasClientAction: false,
					hasClientLoader: false,
					hasClientMiddleware: false,
					hasErrorBoundary: true,
					clientActionModule: undefined,
					clientLoaderModule: undefined,
					clientMiddlewareModule: undefined,
					hydrateFallbackModule: undefined,
				},
			},
			url: '/build/manifest.js',
			version: 'test',
		},
		entry: {
			module: {
				default(_request, responseStatusCode) {
					return new Response(null, { status: responseStatusCode })
				},
				handleError,
			},
		},
		routes: {
			root: {
				id: 'root',
				path: '',
				module: {
					default: function RootRoute() {
						return null
					},
					ErrorBoundary: function RootErrorBoundary() {
						return null
					},
				},
			},
			'routes/$': {
				id: 'routes/$',
				parentId: 'root',
				path: '*',
				module: catchAllRoute,
			},
		},
		publicPath: '/build/',
		assetsBuildDirectory: 'build',
		future: {
			unstable_subResourceIntegrity: false,
			unstable_trailingSlashAwareDataRequests: false,
			v8_middleware: false,
		},
		ssr: true,
		isSpaMode: false,
		prerender: [],
		routeDiscovery: { mode: 'lazy', manifestPath: '/__manifest' },
	}
}

test('catch-all route handles scanner POSTs as normal not found responses', async () => {
	const reportedErrors: Array<unknown> = []
	const handleRequest = createRequestHandler(
		createSplatBuild({
			handleError(error) {
				reportedErrors.push(error)
			},
		}),
		'production',
	)

	for (const pathname of ['/RSC/abc.txt', '/session/root/shell', '/session']) {
		const response = await handleRequest(
			new Request(`http://localhost${pathname}`, {
				method: 'POST',
				headers: { accept: 'text/html' },
			}),
		)

		expect(response.status).toBe(404)
	}

	expect(reportedErrors).toEqual([])
})
