export type CacheRequestStats = {
	lruHits: number
	rpcCalls: number
	rpcMs: number
}

const activeStatsKey = Symbol.for('kentcdodds.activeCacheRequestStats')

type ActiveCacheStatsState = {
	stats: CacheRequestStats
}

function getActiveStatsState(): ActiveCacheStatsState | null {
	return (
		(globalThis as Record<symbol, ActiveCacheStatsState | undefined>)[
			activeStatsKey
		] ?? null
	)
}

export function beginCacheRequestStats(): CacheRequestStats {
	const stats = { lruHits: 0, rpcCalls: 0, rpcMs: 0 }
	;(globalThis as Record<symbol, ActiveCacheStatsState>)[activeStatsKey] = {
		stats,
	}
	return stats
}

export function endCacheRequestStats() {
	delete (globalThis as Record<symbol, unknown>)[activeStatsKey]
}

export function recordCacheLruHit() {
	const state = getActiveStatsState()
	if (state) state.stats.lruHits++
}

export function recordCacheRpcCall(durationMs: number) {
	const state = getActiveStatsState()
	if (!state) return
	state.stats.rpcCalls++
	state.stats.rpcMs += durationMs
}

export function formatCacheRequestStatsHeader(stats: CacheRequestStats) {
	return `lru_hits=${stats.lruHits},rpc_calls=${stats.rpcCalls},rpc_ms=${stats.rpcMs.toFixed(1)}`
}
