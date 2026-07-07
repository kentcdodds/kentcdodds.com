import {
	getRequestContextValue,
	setRequestContextValue,
} from './request-context.server.ts'

/**
 * Bridges the Workers ExecutionContext's `waitUntil` into app code so
 * fire-and-forget work (transcript generation, notifications, cache refresh)
 * survives past the response. Without `waitUntil`, workerd kills pending
 * promises when the request ends — silently, mid-flight.
 *
 * Both runtimes (the dev worker and the production dynamic worker) register
 * the current request's `waitUntil` at request start, inside the request's
 * AsyncLocalStorage context so overlapping requests never see each other's
 * ExecutionContext.
 */
const waitUntilKey = Symbol.for('kentcdodds.waitUntil')

type WaitUntilFn = (promise: Promise<unknown>) => void

export function setRequestWaitUntil(waitUntil: WaitUntilFn) {
	setRequestContextValue(waitUntilKey, waitUntil)
}

function getRequestWaitUntil() {
	return getRequestContextValue<WaitUntilFn>(waitUntilKey)
}

export function runBackgroundTask(task: () => Promise<unknown> | unknown) {
	const waitUntil = getRequestWaitUntil()
	const promise = (async () => task())().catch((error: unknown) => {
		console.error('background task failed', error)
	})
	if (waitUntil) {
		waitUntil(promise)
		return
	}
	void promise
}
