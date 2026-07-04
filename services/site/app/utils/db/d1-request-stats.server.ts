import { type D1Meta } from './d1-sql-executor.server.ts'

export type D1RequestStats = {
	queries: number
	primaryServed: number
	replicaServed: number
	regions: Record<string, number>
}

const activeStatsKey = Symbol.for('kentcdodds.activeD1RequestStats')

type ActiveD1StatsState = {
	stats: D1RequestStats
}

function getActiveStatsState(): ActiveD1StatsState | null {
	return (
		(globalThis as Record<symbol, ActiveD1StatsState | undefined>)[
			activeStatsKey
		] ?? null
	)
}

export function beginD1RequestStats(): D1RequestStats {
	const stats: D1RequestStats = {
		queries: 0,
		primaryServed: 0,
		replicaServed: 0,
		regions: {},
	}
	;(globalThis as Record<symbol, ActiveD1StatsState>)[activeStatsKey] = {
		stats,
	}
	return stats
}

export function endD1RequestStats() {
	delete (globalThis as Record<symbol, unknown>)[activeStatsKey]
}

export function recordD1QueryMeta(meta?: D1Meta) {
	const state = getActiveStatsState()
	if (!state) return
	state.stats.queries++
	if (meta?.served_by_primary === true) {
		state.stats.primaryServed++
	} else if (meta?.served_by_primary === false) {
		state.stats.replicaServed++
	}
	const region = meta?.served_by_region
	if (region) {
		state.stats.regions[region] = (state.stats.regions[region] ?? 0) + 1
	}
}

export function formatD1RequestStatsHeader(stats: D1RequestStats) {
	const regionParts = Object.entries(stats.regions)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([region, count]) => `${region}=${count}`)
	const regionSuffix =
		regionParts.length > 0 ? `,regions=${regionParts.join(';')}` : ''
	return `queries=${stats.queries},primary=${stats.primaryServed},replica=${stats.replicaServed}${regionSuffix}`
}
