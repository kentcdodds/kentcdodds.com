import { createStaticHandler } from 'react-router'
import { expect, test, vi } from 'vitest'

import { action, loader } from '../$.tsx'

vi.mock('vite-env-only/macros', () => ({
	serverOnly$: (fn: unknown) => fn,
}))

type StaticHandlerContext = Awaited<
	ReturnType<ReturnType<typeof createStaticHandler>['query']>
>

type RouteErrorResponse = {
	status: number
	internal?: boolean
	data?: unknown
	error?: unknown
}

test.each(['/RSC/example.txt', '/session/root/shell', '/session'])(
	'catch-all POST to %s returns a normal 404 route response',
	async (pathname) => {
		const handler = createStaticHandler([
			{
				id: 'routes/$',
				path: '*',
				loader,
				action,
			},
		])

		const result = await handler.query(
			new Request(`http://localhost${pathname}`, { method: 'POST' }),
		)

		expect(result).not.toBeInstanceOf(Response)

		const context = result as Exclude<StaticHandlerContext, Response>
		const routeError = context.errors?.['routes/$'] as
			| RouteErrorResponse
			| undefined

		expect(context.statusCode).toBe(404)
		expect(routeError).toMatchObject({
			status: 404,
			internal: false,
			data: 'Not found',
		})
		expect(routeError?.error).toBeUndefined()
	},
)
