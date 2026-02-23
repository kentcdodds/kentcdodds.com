/**
 * Note: We intentionally do NOT use AbortSignal/AbortController here.
 * Node.js v24 has a bug where aborting fetch requests can crash the process.
 *
 * Instead, we use Promise.race to implement timeouts without aborting.
 */
export function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number = 1000,
): Promise<Response> {
	const timeoutPromise = new Promise<never>((_, reject) => {
		const id = setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
		id.unref?.()
	})
	return Promise.race([fetch(url, options), timeoutPromise])
}
