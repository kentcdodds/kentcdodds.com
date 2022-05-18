import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'

import {UseUndoExample} from '../use-undo.example.jsx'

test('allows you to undo and redo', async () => {
  render(<UseUndoExample />)
  const present = screen.getByText(/present/i)
  const past = screen.getByText(/past/i)
  const future = screen.getByText(/future/i)
  const input = screen.getByLabelText(/new value/i)
  const submit = screen.getByText(/submit/i)
  const undo = screen.getByText(/undo/i)
  const redo = screen.getByText(/redo/i)

  // assert initial state
  expect(undo).toBeDisabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past:`)
  expect(present).toHaveTextContent(`Present: one`)
  expect(future).toHaveTextContent(`Future:`)

  // add second value
  input.value = 'two'
  await userEvent.click(submit)

  // assert new state
  expect(undo).toBeEnabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future:`)

  // add third value
  input.value = 'three'
  await userEvent.click(submit)

  // assert new state
  expect(undo).toBeEnabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one, two`)
  expect(present).toHaveTextContent(`Present: three`)
  expect(future).toHaveTextContent(`Future:`)

  // undo
  await userEvent.click(undo)

  // assert "undone" state
  expect(undo).toBeEnabled()
  expect(redo).toBeEnabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future: three`)

  // undo again
  await userEvent.click(undo)

  // assert "double-undone" state
  expect(undo).toBeDisabled()
  expect(redo).toBeEnabled()
  expect(past).toHaveTextContent(`Past:`)
  expect(present).toHaveTextContent(`Present: one`)
  expect(future).toHaveTextContent(`Future: two, three`)

  // redo
  await userEvent.click(redo)

  // assert undo + undo + redo state
  expect(undo).toBeEnabled()
  expect(redo).toBeEnabled()
  expect(past).toHaveTextContent(`Past: one`)
  expect(present).toHaveTextContent(`Present: two`)
  expect(future).toHaveTextContent(`Future: three`)

  // add fourth value
  input.value = 'four'
  await userEvent.click(submit)

  // assert final state (note the lack of "third")
  expect(undo).toBeEnabled()
  expect(redo).toBeDisabled()
  expect(past).toHaveTextContent(`Past: one, two`)
  expect(present).toHaveTextContent(`Present: four`)
  expect(future).toHaveTextContent(`Future:`)
})

/*
eslint
  max-statements: "off",
*/
