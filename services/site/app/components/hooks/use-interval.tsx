import { useEffect, useRef } from 'react'

type CallbackFunction = () => void

interface CallbackRef {
	(): void
}

export function useInterval(callback: CallbackFunction, delay: number) {
	const savedCallback = useRef<CallbackRef>(null)

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback
	}, [callback])

	// Set up the interval.
	useEffect(() => {
		if (delay > 0) {
			const id = setInterval(tick, delay)
			return () => clearInterval(id)
		}
	}, [delay])

	function tick() {
		if (savedCallback.current) {
			savedCallback.current()
		}
	}
}
