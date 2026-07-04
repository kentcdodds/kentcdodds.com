const devWaitUntilKey = Symbol.for('kentcdodds.devWaitUntil')

type WaitUntilFn = (promise: Promise<unknown>) => void

export function setDevWaitUntil(waitUntil: WaitUntilFn | null) {
	;(globalThis as Record<symbol, WaitUntilFn | null>)[devWaitUntilKey] =
		waitUntil
}

function getDevWaitUntil() {
	return (globalThis as Record<symbol, WaitUntilFn | null>)[devWaitUntilKey]
}

const callKentQueueSimulationDelayMs = 0

export function runDevBackgroundTask(task: () => Promise<void>) {
	const waitUntil = getDevWaitUntil()
	const promise = (async () => {
		if (callKentQueueSimulationDelayMs > 0) {
			await new Promise((resolve) => {
				setTimeout(resolve, callKentQueueSimulationDelayMs)
			})
		}
		await task()
	})()
	if (waitUntil) {
		waitUntil(promise)
		return
	}
	void promise
}
