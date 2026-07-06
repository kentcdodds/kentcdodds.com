/**
 * Bridges the Workers ExecutionContext's `waitUntil` into app code so
 * fire-and-forget work (transcript generation, notifications, cache refresh)
 * survives past the response. Without `waitUntil`, workerd kills pending
 * promises when the request ends — silently, mid-flight.
 *
 * Both runtimes (the dev worker and the production dynamic worker) register
 * the current request's `waitUntil` at request start.
 */
const waitUntilKey = Symbol.for('kentcdodds.waitUntil')

type WaitUntilFn = (promise: Promise<unknown>) => void

export function setRequestWaitUntil(waitUntil: WaitUntilFn | null) {
	;(globalThis as Record<symbol, WaitUntilFn | null>)[waitUntilKey] = waitUntil
}

function getRequestWaitUntil() {
	return (globalThis as Record<symbol, WaitUntilFn | null>)[waitUntilKey]
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
