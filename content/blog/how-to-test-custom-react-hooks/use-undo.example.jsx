import * as React from 'react'
import useUndo from './use-undo'

function UseUndoExample() {
  const {present, past, future, set, undo, redo, canUndo, canRedo} =
    useUndo('one')
  function handleSubmit(event) {
    event.preventDefault()
    const input = event.target.elements.newValue
    set(input.value)
    input.value = ''
  }

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>
          undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          redo
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="newValue">New value</label>
        <input type="text" id="newValue" />
        <div>
          <button type="submit">Submit</button>
        </div>
      </form>
      <div>Present: {present}</div>
      <div>Past: {past.join(', ')}</div>
      <div>Future: {future.join(', ')}</div>
    </div>
  )
}

export {UseUndoExample}
