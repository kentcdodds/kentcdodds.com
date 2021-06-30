import * as React from 'react'

const UNDO = 'UNDO'
const REDO = 'REDO'
const SET = 'SET'
const RESET = 'RESET'

function undoReducer(state, action) {
  const {past, present, future} = state
  const {type, newPresent} = action

  switch (action.type) {
    case UNDO: {
      if (past.length === 0) return state

      const previous = past[past.length - 1]
      const newPast = past.slice(0, past.length - 1)

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      }
    }

    case REDO: {
      if (future.length === 0) return state

      const next = future[0]
      const newFuture = future.slice(1)

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      }
    }

    case SET: {
      if (newPresent === present) return state

      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      }
    }

    case RESET: {
      return {
        past: [],
        present: newPresent,
        future: [],
      }
    }
    default: {
      throw new Error(`Unhandled action type: ${type}`)
    }
  }
}

function useUndo(initialPresent) {
  const [state, dispatch] = React.useReducer(undoReducer, {
    past: [],
    present: initialPresent,
    future: [],
  })

  const canUndo = state.past.length !== 0
  const canRedo = state.future.length !== 0
  const undo = React.useCallback(() => dispatch({type: UNDO}), [])
  const redo = React.useCallback(() => dispatch({type: REDO}), [])
  const set = React.useCallback(
    newPresent => dispatch({type: SET, newPresent}),
    [],
  )
  const reset = React.useCallback(
    newPresent => dispatch({type: RESET, newPresent}),
    [],
  )

  return {...state, set, reset, undo, redo, canUndo, canRedo}
}

export default useUndo
