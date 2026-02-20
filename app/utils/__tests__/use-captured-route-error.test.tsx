import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCaptureException, mockIsRouteErrorResponse, mockUseRouteError } =
	vi.hoisted(() => ({
		mockCaptureException: vi.fn(),
		mockIsRouteErrorResponse: vi.fn(),
		mockUseRouteError: vi.fn(),
	}))

vi.mock('@sentry/react-router', async () => {
	const actual =
		await vi.importActual<typeof import('@sentry/react-router')>(
			'@sentry/react-router',
		)
	return {
		...actual,
		captureException: mockCaptureException,
	}
})

vi.mock('react-router', async () => {
	const actual = await vi.importActual<typeof import('react-router')>(
		'react-router',
	)
	return {
		...actual,
		isRouteErrorResponse: mockIsRouteErrorResponse,
		useRouteError: mockUseRouteError,
	}
})

import { useCapturedRouteError } from '../misc.tsx'

function TestComponent() {
	useCapturedRouteError()
	return <div>hook called</div>
}

describe('useCapturedRouteError', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('captures 5xx route error responses as Error instances', () => {
		const routeErrorResponse = {
			status: 503,
			statusText: 'Service Unavailable',
			data: { reason: 'downstream outage' },
		}
		mockUseRouteError.mockReturnValue(routeErrorResponse)
		mockIsRouteErrorResponse.mockImplementation(
			(error: unknown) => error === routeErrorResponse,
		)

		render(<TestComponent />)

		expect(mockCaptureException).toHaveBeenCalledTimes(1)
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

	it('does not capture non-5xx route error responses', () => {
		const routeErrorResponse = {
			status: 404,
			statusText: 'Not Found',
			data: 'Not Found',
		}
		mockUseRouteError.mockReturnValue(routeErrorResponse)
		mockIsRouteErrorResponse.mockImplementation(
			(error: unknown) => error === routeErrorResponse,
		)

		render(<TestComponent />)

		expect(mockCaptureException).not.toHaveBeenCalled()
	})

	it('captures non-route errors as-is', () => {
		const thrownError = new Error('unexpected')
		mockUseRouteError.mockReturnValue(thrownError)
		mockIsRouteErrorResponse.mockReturnValue(false)

		render(<TestComponent />)

		expect(mockCaptureException).toHaveBeenCalledWith(thrownError)
	})
})
