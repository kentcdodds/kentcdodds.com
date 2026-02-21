import { getInstanceInfo } from '../app/utils/litefs-js.server.ts'
import {
	deleteExpiredSessions,
	deleteExpiredVerifications,
} from '../app/utils/prisma.server.ts'

type CleanupController = {
	stop: () => Promise<void>
	runNow: (reason?: string) => Promise<void>
}

type CleanupOptions = {
	/**
	 * How often to attempt cleanup. The cleanup itself is a no-op on
	 * non-primary LiteFS instances.
	 */
	intervalMs?: number
	/**
	 * Delay the first run a bit to avoid doing extra work during startup.
	 */
	startupDelayMs?: number
	/**
	 * Disable for unusual environments/troubleshooting.
	 */
	enabled?: boolean
}

const DAY_MS = 1000 * 60 * 60 * 24

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function scheduleExpiredDataCleanup({
	intervalMs = DAY_MS,
	startupDelayMs = randomInt(30_000, 5 * 60_000),
	enabled = process.env.EXPIRED_SESSIONS_CLEANUP_DISABLED !== 'true', // enabled unless explicitly disabled
}: CleanupOptions = {}): CleanupController {
	if (!enabled) {
		return {
			stop: async () => {},
			runNow: async () => {},
		}
	}

	let stopped = false
	let runningPromise: Promise<void> | null = null
	let timeoutId: NodeJS.Timeout | null = null
	let intervalId: NodeJS.Timeout | null = null

	const runNow = async (reason = 'manual') => {
		if (runningPromise) return runningPromise
		if (stopped) return
		runningPromise = (async () => {
			try {
				const { currentIsPrimary, currentInstance, primaryInstance } =
					await getInstanceInfo()
				if (!currentIsPrimary) return

				const deletedSessionsCount = await deleteExpiredSessions()
				const deletedVerificationsCount = await deleteExpiredVerifications()
				if (deletedSessionsCount > 0 || deletedVerificationsCount > 0) {
					console.info(
						`expired-data-cleanup: deleted ${deletedSessionsCount} expired sessions and ${deletedVerificationsCount} expired verifications (${reason})`,
						{
							currentInstance,
							primaryInstance,
						},
					)
				}
			} catch (error: unknown) {
				console.error(`expired-data-cleanup: failed (${reason})`, error)
			} finally {
				runningPromise = null
			}
		})()
		return runningPromise
	}

	timeoutId = setTimeout(() => {
		timeoutId = null
		void runNow('startup')

		intervalId = setInterval(() => {
			void runNow('interval')
		}, intervalMs)
		intervalId.unref?.()
	}, startupDelayMs)
	timeoutId.unref?.()

	return {
		async stop() {
			stopped = true
			if (timeoutId) clearTimeout(timeoutId)
			if (intervalId) clearInterval(intervalId)
			timeoutId = null
			intervalId = null
			if (runningPromise) await runningPromise
		},
		runNow,
	}
}

