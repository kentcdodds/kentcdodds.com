import { beforeEach, describe, expect, it, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'

const { mockCaptureException, mockIsRouteErrorResponse, mockUseRouteError } =
	vi.hoisted(() => ({
		mockCaptureException: vi.fn(),
		mockIsRouteErrorResponse: vi.fn(),
		mockUseRouteError: vi.fn(),
	}))

vi.mock('@sentry/react-router', async () => {
	const actual = await vi.importActual('@sentry/react-router')
	return {
		...actual,
		captureException: mockCaptureException,
	}
})

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router')
	return {
		...actual,
		isRouteErrorResponse: mockIsRouteErrorResponse,
		useRouteError: mockUseRouteError,
	}
})

import {
	getSessionStorageSafely,
	shouldHardReloadSpaNavNetworkError,
	shouldShowSpaNavNetworkReconnecting,
	useCapturedRouteError,
} from '../misc-react.tsx'

function TestComponent() {
	useCapturedRouteError()
	return <div>hook called</div>
}

function spaNavNetworkTypeError(
	message = 'Failed to fetch (kentcdodds.com)',
): TypeError {
	const error = new TypeError(message)
	error.stack = `${error.name}: ${message}
    at fetchAndApplyManifestPatches (react-router/dist/chunk.js:1:1)
    at discoverRoutes (react-router/dist/chunk.js:1:1)`
	return error
}

describe('useCapturedRouteError', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('captures 5xx route error responses as Error instances', async () => {
		const routeErrorResponse = {
			status: 503,
			statusText: 'Service Unavailable',
			data: { reason: 'downstream outage' },
		}
		mockUseRouteError.mockReturnValue(routeErrorResponse)
		mockIsRouteErrorResponse.mockImplementation(
			(error: unknown) => error === routeErrorResponse,
		)

		await render(<TestComponent />)

		await expect.poll(() => mockCaptureException.mock.calls.length).toBe(1)
		const [capturedError, context] = mockCaptureException.mock.calls[0] as [
			Error,
			{ extra: { route_error_response: unknown } },
		]
		expect(capturedError).toBeInstanceOf(Error)
		expect(capturedError).not.toBe(routeErrorResponse)
		expect(capturedError.name).toBe('RouteErrorResponse')
		expect(capturedError.message).toBe('503 Service Unavailable')
		expect(context).toEqual({
			extra: {
				route_error_response: {
					status: 503,
					statusText: 'Service Unavailable',
					data: { reason: 'downstream outage' },
				},
			},
		})
	})

	it('does not capture Cloudflare edge Bad Gateway route errors', async () => {
		const routeErrorResponse = {
			status: 502,
			statusText: '',
			data: `<!DOCTYPE html><html><head><title>kentcdodds.com | 502: Bad gateway</title></head><body>Ray ID: abc cloudflare</body></html>`,
		}
		mockUseRouteError.mockReturnValue(routeErrorResponse)
		mockIsRouteErrorResponse.mockImplementation(
			(error: unknown) => error === routeErrorResponse,
		)

		await render(<TestComponent />)

		expect(mockCaptureException).not.toHaveBeenCalled()
	})

	it('does not capture non-5xx route error responses', async () => {
		const routeErrorResponse = {
			status: 404,
			statusText: 'Not Found',
			data: 'Not Found',
		}
		mockUseRouteError.mockReturnValue(routeErrorResponse)
		mockIsRouteErrorResponse.mockImplementation(
			(error: unknown) => error === routeErrorResponse,
		)

		await render(<TestComponent />)

		expect(mockCaptureException).not.toHaveBeenCalled()
	})

	it('captures non-route errors as-is', async () => {
		const thrownError = new Error('unexpected')
		mockUseRouteError.mockReturnValue(thrownError)
		mockIsRouteErrorResponse.mockReturnValue(false)

		await render(<TestComponent />)

		await expect.poll(() => mockCaptureException.mock.calls.length).toBe(1)
		expect(mockCaptureException).toHaveBeenCalledWith(thrownError)
	})

	it('does not capture React Router sanitized Unexpected Server Error', async () => {
		const sanitized = new Error('Unexpected Server Error')
		sanitized.stack = undefined
		mockUseRouteError.mockReturnValue(sanitized)
		mockIsRouteErrorResponse.mockReturnValue(false)

		await render(<TestComponent />)

		expect(mockCaptureException).not.toHaveBeenCalled()
	})

	it('does not capture React Router SPA-nav network TypeErrors (KCD-10B)', async () => {
		const spaNavError = spaNavNetworkTypeError()
		mockUseRouteError.mockReturnValue(spaNavError)
		mockIsRouteErrorResponse.mockReturnValue(false)

		// Pre-mark this location so the hard-reload effect does not call
		// location.reload() (non-configurable in Playwright).
		const locationKey = `${window.location.pathname}${window.location.search}`
		window.sessionStorage.setItem(
			`kcd:spa-nav-network-reload:${locationKey}`,
			'1',
		)

		await render(<TestComponent />)

		expect(mockCaptureException).not.toHaveBeenCalled()
	})
})

test('shouldHardReloadSpaNavNetworkError is one-shot per location', () => {
	const storage = new Map<string, string>()
	const sessionStorageLike = {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			storage.set(key, value)
		},
	}
	const error = spaNavNetworkTypeError('Load failed')

	expect(
		shouldShowSpaNavNetworkReconnecting(
			error,
			sessionStorageLike,
			'/blog/post',
		),
	).toBe(true)
	expect(
		shouldHardReloadSpaNavNetworkError(error, sessionStorageLike, '/blog/post'),
	).toBe(true)
	expect(
		shouldShowSpaNavNetworkReconnecting(
			error,
			sessionStorageLike,
			'/blog/post',
		),
	).toBe(false)
	expect(
		shouldHardReloadSpaNavNetworkError(error, sessionStorageLike, '/blog/post'),
	).toBe(false)
	expect(
		shouldHardReloadSpaNavNetworkError(error, sessionStorageLike, '/about'),
	).toBe(true)

	const unrelated = new TypeError('Failed to fetch')
	unrelated.stack = 'TypeError: Failed to fetch\n    at app.js:1:1'
	expect(
		shouldHardReloadSpaNavNetworkError(unrelated, sessionStorageLike, '/other'),
	).toBe(false)
})

test('shouldHardReloadSpaNavNetworkError skips reload when storage throws', () => {
	const error = spaNavNetworkTypeError('Failed to fetch')
	const brokenStorage = {
		getItem: () => {
			throw new Error('blocked')
		},
		setItem: () => {
			throw new Error('blocked')
		},
	}
	expect(
		shouldHardReloadSpaNavNetworkError(error, brokenStorage, '/blog'),
	).toBe(false)
	expect(
		shouldShowSpaNavNetworkReconnecting(error, brokenStorage, '/blog'),
	).toBe(false)
})

test('shouldShowSpaNavNetworkReconnecting is false when setItem throws', () => {
	const error = spaNavNetworkTypeError('Failed to fetch')
	const readOkWriteFails = {
		getItem: () => null,
		setItem: () => {
			throw new Error('quota')
		},
	}
	expect(
		shouldShowSpaNavNetworkReconnecting(error, readOkWriteFails, '/blog'),
	).toBe(false)
	expect(
		shouldHardReloadSpaNavNetworkError(error, readOkWriteFails, '/blog'),
	).toBe(false)
})

test('getSessionStorageSafely returns null when the getter throws', () => {
	const throwingWindow = {
		get sessionStorage(): Storage {
			throw new Error('SecurityError')
		},
	}
	expect(getSessionStorageSafely(throwingWindow)).toBe(null)
	const error = spaNavNetworkTypeError('Failed to fetch')
	expect(
		shouldHardReloadSpaNavNetworkError(
			error,
			getSessionStorageSafely(throwingWindow),
			'/blog',
		),
	).toBe(false)
	expect(
		shouldShowSpaNavNetworkReconnecting(
			error,
			getSessionStorageSafely(throwingWindow),
			'/blog',
		),
	).toBe(false)
})
