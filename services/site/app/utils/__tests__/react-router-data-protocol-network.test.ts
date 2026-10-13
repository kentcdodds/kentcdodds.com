import { expect, test, vi } from 'vitest'
import {
	getRecentFailedDataProtocolNetworkFetch,
	hasClientDataProtocolNetworkFailureEvidence,
	hasSpaNavDataProtocolNetworkFailureEvidence,
	installReactRouterDataProtocolFetchFailureTracker,
	isFailedDataProtocolNetworkFetchBreadcrumb,
	noteFailedDataProtocolNetworkFetch,
	resetFailedDataProtocolNetworkFetchForTests,
} from '../react-router-data-protocol-network.ts'

test('notes only .data / __manifest URLs', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch('https://kentcdodds.com/api/custom', 'GET')
	expect(getRecentFailedDataProtocolNetworkFetch()).toBe(null)

	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/blog/foo.data',
		'GET',
	)
	expect(getRecentFailedDataProtocolNetworkFetch()).toEqual({
		url: 'https://kentcdodds.com/blog/foo.data',
		method: 'GET',
		at: expect.any(Number),
	})

	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/__manifest?paths=%2Fblog&version=abc',
		'get',
	)
	expect(getRecentFailedDataProtocolNetworkFetch()?.method).toBe('GET')
})

test('SPA-nav evidence requires GET; client evidence allows POST', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/resources/promotification.data',
		'POST',
	)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence()).toBe(false)
	expect(hasClientDataProtocolNetworkFailureEvidence()).toBe(true)

	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/blog/foo.data',
		'GET',
	)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence()).toBe(true)
})

test('failed fetch breadcrumbs require error level and no status_code', () => {
	expect(
		isFailedDataProtocolNetworkFetchBreadcrumb({
			category: 'fetch',
			level: 'error',
			data: {
				method: 'GET',
				url: 'https://kentcdodds.com/blog/foo.data',
			},
		}),
	).toBe(true)
	expect(
		isFailedDataProtocolNetworkFetchBreadcrumb({
			category: 'fetch',
			level: 'error',
			data: {
				method: 'GET',
				status_code: 200,
				url: 'https://kentcdodds.com/blog/foo.data',
			},
		}),
	).toBe(false)
	expect(
		isFailedDataProtocolNetworkFetchBreadcrumb({
			category: 'fetch',
			level: 'info',
			data: {
				method: 'GET',
				url: 'https://kentcdodds.com/blog/foo.data',
			},
		}),
	).toBe(false)
	expect(
		isFailedDataProtocolNetworkFetchBreadcrumb({
			category: 'fetch',
			level: 'error',
			data: {
				method: 'GET',
				url: 'https://kentcdodds.com/api/custom',
			},
		}),
	).toBe(false)
})

test('installReactRouterDataProtocolFetchFailureTracker notes TypeError on .data', async () => {
	resetFailedDataProtocolNetworkFetchForTests()
	const originalFetch = vi.fn(async () => {
		throw new TypeError('Failed to fetch')
	})
	const target = { fetch: originalFetch as unknown as typeof fetch }
	installReactRouterDataProtocolFetchFailureTracker(target)

	await expect(
		target.fetch('https://kentcdodds.com/blog/foo.data'),
	).rejects.toThrow(TypeError)
	expect(getRecentFailedDataProtocolNetworkFetch()?.url).toBe(
		'https://kentcdodds.com/blog/foo.data',
	)

	resetFailedDataProtocolNetworkFetchForTests()
	await expect(
		target.fetch('https://kentcdodds.com/api/custom'),
	).rejects.toThrow(TypeError)
	expect(getRecentFailedDataProtocolNetworkFetch()).toBe(null)
})
