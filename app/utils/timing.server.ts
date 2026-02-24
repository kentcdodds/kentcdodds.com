export type Timings = Record<
	string,
	Array<{ desc?: string; type: string; time: number }>
>

export async function time<ReturnType>(
	fn: Promise<ReturnType> | (() => ReturnType | Promise<ReturnType>),
	{
		type,
		desc,
		timings,
	}: {
		type: string
		desc?: string
		timings?: Timings
	},
): Promise<ReturnType> {
	const start = performance.now()
	const promise = typeof fn === 'function' ? fn() : fn
	if (!timings) return promise
	const result = await promise
	let timingType = timings[type]
	if (!timingType) {
		timingType = timings[type] = []
	}

	timingType.push({ desc, type, time: performance.now() - start })
	return result
}

/**
 * Race a promise against a timeout. On timeout, returns the fallback value
 * instead of rejecting. Used to cap blocking time for non-critical data.
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	{
		timeoutMs,
		fallback,
		label = 'operation',
	}: {
		timeoutMs: number
		fallback: T
		label?: string
	},
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms`))
		}, timeoutMs)
	})
	try {
		const result = await Promise.race([promise, timeoutPromise])
		clearTimeout(timeoutId)
		return result
	} catch (error) {
		clearTimeout(timeoutId)
		console.warn(`${label}: timeout or error, using fallback`, error)
		return fallback
	}
}

export function getServerTimeHeader(timings: Timings) {
	return Object.entries(timings)
		.map(([key, timingInfos]) => {
			const dur = timingInfos
				.reduce((acc, timingInfo) => acc + timingInfo.time, 0)
				.toFixed(1)
			const desc = timingInfos
				.map((t) => t.desc)
				.filter(Boolean)
				.join(' & ')
			return [
				key.replaceAll(/(:| |@|=|;|,)/g, '_'),
				desc ? `desc=${JSON.stringify(desc)}` : null,
				`dur=${dur}`,
			]
				.filter(Boolean)
				.join(';')
		})
		.join(',')
}
