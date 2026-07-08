import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Per-request state bag, backed by AsyncLocalStorage. A single workerd
 * isolate serves overlapping requests, so per-request state must never live
 * on bare `globalThis`: concurrent requests would overwrite each other's
 * state and one request's cleanup would delete another's mid-flight.
 *
 * Each per-request module (D1 session, D1/cache stats, waitUntil bridge)
 * keeps its own symbol key into the bag. Request entry points wrap handling
 * in `runWithRequestContext`; outside of it (crons, tests) accessors see an
 * empty context and degrade gracefully.
 */
const requestContextStorage = new AsyncLocalStorage<Map<symbol, unknown>>()

export function runWithRequestContext<T>(fn: () => Promise<T>): Promise<T> {
	return requestContextStorage.run(new Map(), fn)
}

export function getRequestContextValue<T>(key: symbol): T | undefined {
	return requestContextStorage.getStore()?.get(key) as T | undefined
}

export function setRequestContextValue(key: symbol, value: unknown) {
	requestContextStorage.getStore()?.set(key, value)
}

export function deleteRequestContextValue(key: symbol) {
	requestContextStorage.getStore()?.delete(key)
}

export function hasRequestContext(): boolean {
	return requestContextStorage.getStore() !== undefined
}
