export type CacheRequestStats = {
	lruHits: number
	rpcCalls: number
	rpcMs: number
}

let activeCacheStats: CacheRequestStats | null = null

export function beginCacheRequestStats(): CacheRequestStats {
	const stats = { lruHits: 0, rpcCalls: 0, rpcMs: 0 }
	activeCacheStats = stats
	return stats
}

export function endCacheRequestStats() {
	activeCacheStats = null
}

export function recordCacheLruHit() {
	if (activeCacheStats) activeCacheStats.lruHits++
}

export function recordCacheRpcCall(durationMs: number) {
	if (!activeCacheStats) return
	activeCacheStats.rpcCalls++
	activeCacheStats.rpcMs += durationMs
}

export function formatCacheRequestStatsHeader(stats: CacheRequestStats) {
	return `lru_hits=${stats.lruHits},rpc_calls=${stats.rpcCalls},rpc_ms=${stats.rpcMs.toFixed(1)}`
}
