import { expect, test, vi } from 'vitest'
import {
	DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS,
	consumeRecentFailedDataProtocolNetworkFetch,
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
	resetFailedDataProtocolNetworkFetchForTests()
})

test('SPA-nav evidence requires GET .data; excludes POST and __manifest', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/resources/promotification.data',
		'POST',
	)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence()).toBe(false)
	expect(hasClientDataProtocolNetworkFailureEvidence()).toBe(true)

	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/__manifest?paths=%2Fblog&version=abc',
		'GET',
	)
	// Fog-of-war __manifest can fail during fetcher submissions — not hard-reload.
	expect(hasSpaNavDataProtocolNetworkFailureEvidence()).toBe(false)
	expect(hasClientDataProtocolNetworkFailureEvidence()).toBe(true)

	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/blog/foo.data',
		'GET',
	)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence()).toBe(true)
	resetFailedDataProtocolNetworkFetchForTests()
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

test('breadcrumb evidence uses only the most recent error fetch within max age', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	const now = Date.now()
	const staleTs = (now - DATA_PROTOCOL_NETWORK_FAILURE_MAX_AGE_MS - 1000) / 1000
	const freshTs = now / 1000

	expect(
		hasClientDataProtocolNetworkFailureEvidence(
			[
				{
					category: 'fetch',
					level: 'error',
					timestamp: staleTs,
					data: {
						method: 'GET',
						url: 'https://kentcdodds.com/blog/foo.data',
					},
				},
			],
			now,
		),
	).toBe(false)

	// A later unrelated Failed to fetch must not be classified by an older .data.
	expect(
		hasClientDataProtocolNetworkFailureEvidence(
			[
				{
					category: 'fetch',
					level: 'error',
					timestamp: freshTs - 1,
					data: {
						method: 'GET',
						url: 'https://kentcdodds.com/blog/foo.data',
					},
				},
				{
					category: 'fetch',
					level: 'error',
					timestamp: freshTs,
					data: {
						method: 'GET',
						url: 'https://kentcdodds.com/api/custom',
					},
				},
			],
			now,
		),
	).toBe(false)

	expect(
		hasSpaNavDataProtocolNetworkFailureEvidence(
			[
				{
					category: 'fetch',
					level: 'error',
					timestamp: freshTs,
					data: {
						method: 'GET',
						url: 'https://kentcdodds.com/blog/foo.data',
					},
				},
			],
			now,
		),
	).toBe(true)

	expect(
		hasSpaNavDataProtocolNetworkFailureEvidence(
			[
				{
					category: 'fetch',
					level: 'error',
					timestamp: freshTs,
					data: {
						method: 'GET',
						url: 'https://kentcdodds.com/__manifest?paths=%2Fblog',
					},
				},
			],
			now,
		),
	).toBe(false)
})

test('consumeRecentFailedDataProtocolNetworkFetch clears the tracker note', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/blog/foo.data',
		'GET',
	)
	expect(consumeRecentFailedDataProtocolNetworkFetch()?.url).toContain('.data')
	expect(getRecentFailedDataProtocolNetworkFetch()).toBe(null)
})

test('tracker note does not override a newer error fetch breadcrumb', () => {
	resetFailedDataProtocolNetworkFetchForTests()
	const now = Date.now()
	noteFailedDataProtocolNetworkFetch(
		'https://kentcdodds.com/blog/foo.data',
		'GET',
		now - 1000,
	)
	const unrelatedCrumbs = [
		{
			category: 'fetch',
			level: 'error',
			timestamp: now / 1000,
			data: {
				method: 'GET',
				url: 'https://kentcdodds.com/api/custom',
			},
		},
	]
	expect(
		hasClientDataProtocolNetworkFailureEvidence(unrelatedCrumbs, now),
	).toBe(false)
	expect(
		hasSpaNavDataProtocolNetworkFailureEvidence(unrelatedCrumbs, now),
	).toBe(false)

	// Later POST .data is data-protocol for beforeSend, but not SPA-nav hard-reload
	// — must not use the earlier GET .data tracker note to authorize reload.
	const postDataCrumbs = [
		{
			category: 'fetch',
			level: 'error',
			timestamp: now / 1000,
			data: {
				method: 'POST',
				url: 'https://kentcdodds.com/resources/promotification.data',
			},
		},
	]
	expect(hasClientDataProtocolNetworkFailureEvidence(postDataCrumbs, now)).toBe(
		true,
	)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence(postDataCrumbs, now)).toBe(
		false,
	)

	// Without breadcrumbs, the tracker note still counts (Sentry not ready).
	expect(hasClientDataProtocolNetworkFailureEvidence(null, now)).toBe(true)
	expect(hasSpaNavDataProtocolNetworkFailureEvidence(null, now)).toBe(true)
	resetFailedDataProtocolNetworkFetchForTests()
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
	resetFailedDataProtocolNetworkFetchForTests()
})
