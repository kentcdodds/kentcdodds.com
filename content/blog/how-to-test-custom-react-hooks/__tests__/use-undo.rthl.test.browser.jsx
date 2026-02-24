import { test, expect } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import useUndo from '../use-undo.js'

test('allows you to undo and redo', () => {
	return (async () => {
		const { result, act } = await renderHook(() => useUndo('one'))

		// assert initial state
		expect(result.current.canUndo).toBe(false)
		expect(result.current.canRedo).toBe(false)
		expect(result.current.past).toEqual([])
		expect(result.current.present).toBe('one')
		expect(result.current.future).toEqual([])

		// add second value
		await act(() => {
			result.current.set('two')
		})

		// assert new state
		expect(result.current.canUndo).toBe(true)
		expect(result.current.canRedo).toBe(false)
		expect(result.current.past).toEqual(['one'])
		expect(result.current.present).toBe('two')
		expect(result.current.future).toEqual([])

		// add third value
		await act(() => {
			result.current.set('three')
		})

		// assert new state
		expect(result.current.canUndo).toBe(true)
		expect(result.current.canRedo).toBe(false)
		expect(result.current.past).toEqual(['one', 'two'])
		expect(result.current.present).toBe('three')
		expect(result.current.future).toEqual([])

		// undo
		await act(() => {
			result.current.undo()
		})

		// assert "undone" state
		expect(result.current.canUndo).toBe(true)
		expect(result.current.canRedo).toBe(true)
		expect(result.current.past).toEqual(['one'])
		expect(result.current.present).toBe('two')
		expect(result.current.future).toEqual(['three'])

		// undo again
		await act(() => {
			result.current.undo()
		})

		// assert "double-undone" state
		expect(result.current.canUndo).toBe(false)
		expect(result.current.canRedo).toBe(true)
		expect(result.current.past).toEqual([])
		expect(result.current.present).toBe('one')
		expect(result.current.future).toEqual(['two', 'three'])

		// redo
		await act(() => {
			result.current.redo()
		})

		// assert undo + undo + redo state
		expect(result.current.canUndo).toBe(true)
		expect(result.current.canRedo).toBe(true)
		expect(result.current.past).toEqual(['one'])
		expect(result.current.present).toBe('two')
		expect(result.current.future).toEqual(['three'])

		// add fourth value
		await act(() => {
			result.current.set('four')
		})

		// assert final state (note the lack of "third")
		expect(result.current.canUndo).toBe(true)
		expect(result.current.canRedo).toBe(false)
		expect(result.current.past).toEqual(['one', 'two'])
		expect(result.current.present).toBe('four')
		expect(result.current.future).toEqual([])
	})()
})

/*
eslint
  max-statements: "off",
*/
