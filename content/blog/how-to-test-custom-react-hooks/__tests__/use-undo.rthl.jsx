import {renderHook, act} from '@testing-library/react'
import useUndo from '../use-undo'

test('allows you to undo and redo', () => {
  const {result} = renderHook(() => useUndo('one'))

  // assert initial state
  expect(result.current.canUndo).toBe(false)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual([])
  expect(result.current.present).toEqual('one')
  expect(result.current.future).toEqual([])

  // add second value
  act(() => {
    result.current.set('two')
  })

  // assert new state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual([])

  // add third value
  act(() => {
    result.current.set('three')
  })

  // assert new state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one', 'two'])
  expect(result.current.present).toEqual('three')
  expect(result.current.future).toEqual([])

  // undo
  act(() => {
    result.current.undo()
  })

  // assert "undone" state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual(['three'])

  // undo again
  act(() => {
    result.current.undo()
  })

  // assert "double-undone" state
  expect(result.current.canUndo).toBe(false)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual([])
  expect(result.current.present).toEqual('one')
  expect(result.current.future).toEqual(['two', 'three'])

  // redo
  act(() => {
    result.current.redo()
  })

  // assert undo + undo + redo state
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(true)
  expect(result.current.past).toEqual(['one'])
  expect(result.current.present).toEqual('two')
  expect(result.current.future).toEqual(['three'])

  // add fourth value
  act(() => {
    result.current.set('four')
  })

  // assert final state (note the lack of "third")
  expect(result.current.canUndo).toBe(true)
  expect(result.current.canRedo).toBe(false)
  expect(result.current.past).toEqual(['one', 'two'])
  expect(result.current.present).toEqual('four')
  expect(result.current.future).toEqual([])
})

/*
eslint
  max-statements: "off",
*/
