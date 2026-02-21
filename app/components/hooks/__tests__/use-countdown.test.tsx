import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from '../use-countdown.ts'

function CountdownProbe({
	endTimeMs,
	onSeconds,
}: {
	endTimeMs: number
	onSeconds: (secondsLeft: number) => void
}) {
	const timeLeftMs = useCountdown(endTimeMs, 1000)
	const secondsLeft = Math.floor(timeLeftMs / 1000)

	React.useEffect(() => {
		onSeconds(secondsLeft)
	}, [onSeconds, secondsLeft])

	return <div data-testid="seconds-left">{secondsLeft}</div>
}

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('useCountdown', () => {
	it('jumps to current remaining time on focus (no rapid catch-up)', () => {
		vi.useFakeTimers()

		const start = new Date('2026-02-21T00:00:00.000Z')
		const end = new Date(start.getTime() + 2 * 60 * 1000) // +2 minutes
		vi.setSystemTime(start)

		const seen: Array<number> = []
		render(
			<CountdownProbe
				endTimeMs={end.getTime()}
				onSeconds={(s) => seen.push(s)}
			/>,
		)

		expect(screen.getByTestId('seconds-left')).toHaveTextContent('120')

		// Simulate leaving the tab for ~55s (timers do not run while hidden).
		vi.setSystemTime(new Date(start.getTime() + 55 * 1000))

		// Coming back should immediately reflect the current remaining time
		// (it should not tick down rapidly 55 times).
		act(() => {
			window.dispatchEvent(new Event('focus'))
		})

		expect(screen.getByTestId('seconds-left')).toHaveTextContent('65')
		expect(seen[0]).toBe(120)
		expect(seen.at(-1)).toBe(65)
		expect(seen.length).toBeLessThan(10)
	})
})

