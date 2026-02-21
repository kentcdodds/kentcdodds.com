import * as React from 'react'

function getTimeLeftMs(endTimeMs: number) {
	return Math.max(0, endTimeMs - Date.now())
}

/**
 * Countdown to an absolute timestamp.
 *
 * Important: compute from `Date.now()` each tick so returning from a background
 * tab jumps to the current remaining time instead of "catching up" quickly.
 */
export function useCountdown(endTimeMs: number, intervalMs = 1000) {
	const [timeLeftMs, setTimeLeftMs] = React.useState(() =>
		getTimeLeftMs(endTimeMs),
	)

	React.useEffect(() => {
		if (intervalMs <= 0) return

		let timeoutId: number | undefined
		let cancelled = false

		function clearScheduledTick() {
			if (timeoutId !== undefined) {
				window.clearTimeout(timeoutId)
				timeoutId = undefined
			}
		}

		function tick() {
			if (cancelled) return
			setTimeLeftMs(getTimeLeftMs(endTimeMs))
		}

		function scheduleNextTick() {
			if (cancelled) return

			const remaining = getTimeLeftMs(endTimeMs)
			if (remaining <= 0) return

			// Align to the next interval boundary relative to `endTimeMs`.
			const delay = remaining % intervalMs || intervalMs
			timeoutId = window.setTimeout(() => {
				tick()
				scheduleNextTick()
			}, delay)
		}

		// Initialize immediately (helps hydration + visibilitychange updates).
		tick()
		scheduleNextTick()

		function resync() {
			if (cancelled) return
			clearScheduledTick()
			tick()
			scheduleNextTick()
		}

		function handleFocus() {
			resync()
		}

		function handleVisibilityChange() {
			// When becoming visible again, jump immediately to the correct value.
			if (!document.hidden) resync()
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			cancelled = true
			clearScheduledTick()
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [endTimeMs, intervalMs])

	return timeLeftMs
}

