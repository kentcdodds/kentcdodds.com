import { describe, expect, test } from 'vitest'
import {
	runBackgroundTask,
	setRequestWaitUntil,
} from '../background-task.server.ts'
import {
	beginD1RequestStats,
	formatD1RequestStatsHeader,
	recordD1QueryMeta,
} from '../db/d1-request-stats.server.ts'
import { runWithRequestContext } from '../request-context.server.ts'

function tick() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('request context isolation', () => {
	test('concurrent requests keep separate D1 stats', async () => {
		// Interleave two "requests" on the same isolate: each must only see
		// its own stats even while the other records queries between awaits.
		const [first, second] = await Promise.all([
			runWithRequestContext(async () => {
				const stats = beginD1RequestStats()
				recordD1QueryMeta({ served_by_primary: true })
				await tick()
				recordD1QueryMeta({ served_by_primary: true })
				await tick()
				return stats
			}),
			runWithRequestContext(async () => {
				const stats = beginD1RequestStats()
				await tick()
				recordD1QueryMeta({
					served_by_primary: false,
					served_by_region: 'ENAM',
				})
				await tick()
				return stats
			}),
		])

		expect(formatD1RequestStatsHeader(first)).toBe(
			'queries=2,primary=2,replica=0',
		)
		expect(formatD1RequestStatsHeader(second)).toBe(
			'queries=1,primary=0,replica=1,regions=ENAM=1',
		)
	})

	test('concurrent requests keep separate waitUntil bridges', async () => {
		const firstRegistered: Array<Promise<unknown>> = []
		const secondRegistered: Array<Promise<unknown>> = []

		await Promise.all([
			runWithRequestContext(async () => {
				setRequestWaitUntil((promise) => firstRegistered.push(promise))
				await tick()
				runBackgroundTask(() => 'first-task')
			}),
			runWithRequestContext(async () => {
				setRequestWaitUntil((promise) => secondRegistered.push(promise))
				await tick()
				runBackgroundTask(() => 'second-task')
				runBackgroundTask(() => 'second-task-2')
			}),
		])

		expect(firstRegistered).toHaveLength(1)
		expect(secondRegistered).toHaveLength(2)
	})

	test('accessors degrade gracefully outside a request context', () => {
		// Crons and tests run without a context: recording is a no-op and
		// background tasks still run (as floating promises).
		expect(() =>
			recordD1QueryMeta({ served_by_primary: true }),
		).not.toThrow()
		expect(() => runBackgroundTask(() => 'no-context')).not.toThrow()
	})
})
