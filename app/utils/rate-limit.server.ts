import { remember } from '@epic-web/remember'
import { LRUCache } from 'lru-cache'

type RateLimitEntry = {
	count: number
	resetAt: number
}

type RateLimitResult = {
	allowed: boolean
	remaining: number
	retryAfterMs: number | null
	resetAt: number
}

const limiter = remember(
	'server-rate-limiter',
	() => new LRUCache<string, RateLimitEntry>({ max: 10_000 }),
)

/**
 * Simple in-memory fixed-window rate limiter.
 *
 * Note: This is per-process (per instance). It's meant as a best-effort guardrail
 * against abuse, not a perfect global quota.
 */
export function rateLimit({
	key,
	max,
	windowMs,
	now = Date.now(),
}: {
	key: string
	max: number
	windowMs: number
	now?: number
}): RateLimitResult {
	const existing = limiter.get(key)

	// Start a new window if there's no entry or the window has expired.
	if (!existing || existing.resetAt <= now) {
		const resetAt = now + windowMs
		limiter.set(key, { count: 1, resetAt }, { ttl: windowMs })
		return {
			allowed: true,
			remaining: Math.max(0, max - 1),
			retryAfterMs: null,
			resetAt,
		}
	}

	if (existing.count >= max) {
		return {
			allowed: false,
			remaining: 0,
			retryAfterMs: Math.max(0, existing.resetAt - now),
			resetAt: existing.resetAt,
		}
	}

	const next: RateLimitEntry = { count: existing.count + 1, resetAt: existing.resetAt }
	limiter.set(key, next, { ttl: Math.max(1, existing.resetAt - now) })

	return {
		allowed: true,
		remaining: Math.max(0, max - next.count),
		retryAfterMs: null,
		resetAt: next.resetAt,
	}
}

