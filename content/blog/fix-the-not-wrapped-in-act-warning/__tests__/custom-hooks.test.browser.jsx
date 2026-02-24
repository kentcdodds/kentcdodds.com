import * as React from 'react'
import { test, expect } from 'vitest'
import { renderHook } from 'vitest-browser-react'

function useCount() {
	const [count, setCount] = React.useState(0)
	const increment = () => setCount((c) => c + 1)
	const decrement = () => setCount((c) => c - 1)
	return { count, increment, decrement }
}

test('increment and decrement updates the count', async () => {
	const { result, act } = await renderHook(() => useCount())

	expect(result.current.count).toBe(0)
	await act(() => result.current.increment())
	expect(result.current.count).toBe(1)
	await act(() => result.current.decrement())
	expect(result.current.count).toBe(0)
})
