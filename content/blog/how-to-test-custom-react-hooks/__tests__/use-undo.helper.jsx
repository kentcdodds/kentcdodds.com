import * as React from 'react'
import {render, act} from '@testing-library/react'
import useUndo from '../use-undo'

function setup(...args) {
  const returnVal = {}
  function TestComponent() {
    Object.assign(returnVal, useUndo(...args))
    return null
  }
  render(<TestComponent />)
  return returnVal
}

test('allows you to undo and redo', () => {
  const undoData = setup('one')

  // assert initial state
  expect(undoData.canUndo).toBe(false)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual([])
  expect(undoData.present).toEqual('one')
  expect(undoData.future).toEqual([])

  // add second value
  act(() => {
    undoData.set('two')
  })

  // assert new state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual([])

  // add third value
  act(() => {
    undoData.set('three')
  })

  // assert new state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one', 'two'])
  expect(undoData.present).toEqual('three')
  expect(undoData.future).toEqual([])

  // undo
  act(() => {
    undoData.undo()
  })

  // assert "undone" state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual(['three'])

  // undo again
  act(() => {
    undoData.undo()
  })

  // assert "double-undone" state
  expect(undoData.canUndo).toBe(false)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual([])
  expect(undoData.present).toEqual('one')
  expect(undoData.future).toEqual(['two', 'three'])

  // redo
  act(() => {
    undoData.redo()
  })

  // assert undo + undo + redo state
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(true)
  expect(undoData.past).toEqual(['one'])
  expect(undoData.present).toEqual('two')
  expect(undoData.future).toEqual(['three'])

  // add fourth value
  act(() => {
    undoData.set('four')
  })

  // assert final state (note the lack of "third")
  expect(undoData.canUndo).toBe(true)
  expect(undoData.canRedo).toBe(false)
  expect(undoData.past).toEqual(['one', 'two'])
  expect(undoData.present).toEqual('four')
  expect(undoData.future).toEqual([])
})

/*
eslint
  max-statements: "off",
*/
