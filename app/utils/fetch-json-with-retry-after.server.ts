type Sleep = (ms: number) => Promise<void>

const defaultSleep: Sleep = async (ms) => {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

type RetryDelayReason = 'retry-after' | 'rate-limit-reset' | 'default'

type RetryDelay = {
	delayMs: number
	reason: RetryDelayReason
}

function clampMs(ms: number, maxDelayMs: number) {
	if (ms <= 0) return 0
	return Math.min(ms, maxDelayMs)
}

function parseRetryAfterMs(retryAfterHeader: string, nowMs: number) {
	const value = retryAfterHeader.trim()
	if (!value) return null

	// Per RFC 9110, Retry-After can be delta-seconds or an HTTP-date.
	const asNumber = Number(value)
	if (Number.isFinite(asNumber) && asNumber >= 0) {
		return Math.round(asNumber * 1000)
	}

	const asDateMs = Date.parse(value)
	if (Number.isFinite(asDateMs)) {
		return Math.max(0, asDateMs - nowMs)
	}

	return null
}

function parseRateLimitResetMs(resetHeader: string, nowMs: number) {
	const value = resetHeader.trim()
	if (!value) return null

	const n = Number(value)
	if (!Number.isFinite(n) || n < 0) return null

	// Common shapes:
	// - RFC 9230 RateLimit-Reset: delta seconds until reset
	// - X-RateLimit-Reset: epoch seconds (some APIs) or epoch ms (rare)
	if (n > 1e12) return Math.max(0, n - nowMs) // epoch ms
	if (n > 1e9) return Math.max(0, n * 1000 - nowMs) // epoch seconds
	return Math.round(n * 1000) // delta seconds
}

export function getRetryDelayMsFromResponse(
	res: Pick<Response, 'headers'>,
	{
		nowMs = Date.now(),
		defaultDelayMs = 1000,
		maxDelayMs = 1000 * 60,
	}: {
		nowMs?: number
		defaultDelayMs?: number
		maxDelayMs?: number
	} = {},
): RetryDelay {
	const retryAfterHeader = res.headers.get('Retry-After')
	if (retryAfterHeader) {
		const parsed = parseRetryAfterMs(retryAfterHeader, nowMs)
		if (parsed !== null) {
			return { delayMs: clampMs(parsed, maxDelayMs), reason: 'retry-after' }
		}
	}

	// Best-effort support for rate-limit reset headers.
	const resetHeader =
		res.headers.get('RateLimit-Reset') ?? res.headers.get('X-RateLimit-Reset')
	if (resetHeader) {
		const parsed = parseRateLimitResetMs(resetHeader, nowMs)
		if (parsed !== null) {
			return { delayMs: clampMs(parsed, maxDelayMs), reason: 'rate-limit-reset' }
		}
	}

	return {
		delayMs: clampMs(defaultDelayMs, maxDelayMs),
		reason: 'default',
	}
}

export async function fetchJsonWithRetryAfter<JsonResponse>(
	url: string,
	{
		headers,
		maxRetries = 5,
		defaultDelayMs = 750,
		maxDelayMs = 1000 * 60,
		label,
		sleep = defaultSleep,
		fetchImpl = fetch,
		retryOn5xx = false,
	}: {
		headers?: Record<string, string>
		maxRetries?: number
		defaultDelayMs?: number
		maxDelayMs?: number
		label?: string
		sleep?: Sleep
		fetchImpl?: typeof fetch
		retryOn5xx?: boolean
	} = {},
): Promise<JsonResponse> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		const res = await fetchImpl(url, { headers })

		if (res.status === 429) {
			if (attempt >= maxRetries) {
				throw new Error(`${label ?? 'request'}: 429 Too Many Requests`)
			}

			const { delayMs, reason } = getRetryDelayMsFromResponse(res, {
				defaultDelayMs: defaultDelayMs * (attempt + 1),
				maxDelayMs,
			})
			console.warn(
				`${label ?? 'request'}: 429 (attempt ${attempt + 1}/${maxRetries + 1}), waiting ${Math.round(
					delayMs,
				)}ms (${reason})`,
			)
			await sleep(delayMs)
			continue
		}

		if (!res.ok) {
			// Optionally retry transient 5xx.
			if (retryOn5xx && res.status >= 500 && attempt < maxRetries) {
				const delayMs = clampMs(defaultDelayMs * (attempt + 1), maxDelayMs)
				console.warn(
					`${label ?? 'request'}: ${res.status} (attempt ${attempt + 1}/${
						maxRetries + 1
					}), waiting ${Math.round(delayMs)}ms`,
				)
				await sleep(delayMs)
				continue
			}

			let bodyText = ''
			try {
				bodyText = await res.text()
			} catch {
				// ignore
			}
			throw new Error(
				`${label ?? 'request'}: ${res.status} ${res.statusText}${
					bodyText ? ` - ${bodyText}` : ''
				}`,
			)
		}

		return (await res.json()) as JsonResponse
	}

	// This should be unreachable, but keep a deterministic error.
	throw new Error(`${label ?? 'request'}: exceeded max retries`)
}

