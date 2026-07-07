/**
 * Minimal per-IP sliding-window limits for routes the parent worker serves
 * directly (OG images, /media) — these never reach the dynamic worker's rate
 * limiter. State is per-isolate, so the effective global limit scales with
 * isolate count; this is a blunt anti-burn guard, not real abuse control
 * (that lives in Cloudflare WAF/rate-limiting rules — see
 * docs/agents/cloudflare-worker-architecture.md).
 */

type Window = { count: number; resetAt: number }

const WINDOW_MS = 60_000
const windows = new Map<string, Window>()

export const OG_IMAGE_RATE_LIMIT_PER_MINUTE = 60
export const MEDIA_RATE_LIMIT_PER_MINUTE = 600

export function clearParentRateLimitWindowsForTests() {
	windows.clear()
}

export function isParentSecretAuthorized(
	provided: string | null,
	secret: string | undefined,
): boolean {
	if (!provided || !secret) return false
	const encoder = new TextEncoder()
	const providedBytes = encoder.encode(provided)
	const secretBytes = encoder.encode(secret)
	let mismatch = providedBytes.length ^ secretBytes.length
	const length = Math.max(providedBytes.length, secretBytes.length)
	for (let i = 0; i < length; i++) {
		mismatch |= (providedBytes[i] ?? 0) ^ (secretBytes[i] ?? 0)
	}
	return mismatch === 0
}

export function checkParentRateLimit(
	request: Request,
	{ bucket, limit }: { bucket: string; limit: number },
): { allowed: boolean; retryAfterSec: number } {
	const ip =
		request.headers.get('CF-Connecting-IP') ??
		request.headers.get('X-Forwarded-For') ??
		'unknown'
	const key = `${bucket}:${ip}`
	const now = Date.now()

	let window = windows.get(key)
	if (!window || window.resetAt <= now) {
		window = { count: 0, resetAt: now + WINDOW_MS }
		windows.set(key, window)
	}
	window.count += 1

	if (windows.size > 10_000) {
		for (const [existingKey, existing] of windows) {
			if (existing.resetAt <= now) windows.delete(existingKey)
		}
	}

	return {
		allowed: window.count <= limit,
		retryAfterSec: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
	}
}

export function rateLimitedResponse(retryAfterSec: number) {
	return new Response('Too many requests', {
		status: 429,
		headers: { 'Retry-After': String(retryAfterSec) },
	})
}
