import {
	type CacheEvent,
	type CreateReporter,
	verboseReporter,
} from '@epic-web/cachified'

/**
 * Keys backed by MDX compile, GitHub download, or bulk blog indexing. When
 * these hit time limits under load, we keep serving stale cache — errors are
 * expected occasionally and should not page as critical failures.
 */
function isMdxOrContentCacheKey(key: string): boolean {
	return (
		key.endsWith(':compiled') ||
		key.endsWith(':downloaded') ||
		key.endsWith(':dir-list') ||
		key === 'blog:mdx-list-items'
	)
}

function isTimeoutLikeError(error: unknown): boolean {
	if (error == null || typeof error !== 'object') return false
	const e = error as { name?: unknown; message?: unknown }
	if (e.name === 'TimeoutError' || e.name === 'AbortError') return true
	if (typeof e.message === 'string' && /timed out|timeout/i.test(e.message)) {
		return true
	}
	return false
}

/**
 * Wraps {@link verboseReporter}: MDX/content cache timeouts during refresh or
 * fresh fetches log as warnings instead of errors (stale value is kept).
 */
export function siteCacheReporter<Value = unknown>(): CreateReporter<Value> {
	const base = verboseReporter<Value>()
	return (context) => {
		const inner = base(context)
		return (event: CacheEvent<Value>) => {
			if (
				(event.name === 'refreshValueError' ||
					event.name === 'getFreshValueError') &&
				isMdxOrContentCacheKey(context.key) &&
				isTimeoutLikeError(event.error)
			) {
				console.warn(
					`[cache] ${event.name === 'refreshValueError' ? 'Background refresh' : 'Fresh value fetch'} timed out for ${context.key} (keeping cached value).`,
					event.error,
				)
				return
			}
			inner(event)
		}
	}
}
