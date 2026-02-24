import { test, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { UseUndoExample } from '../use-undo.example.jsx'

test('allows you to undo and redo', async () => {
	const screen = await render(<UseUndoExample />)
	const present = screen.getByText(/present/i)
	const past = screen.getByText(/past/i)
	const future = screen.getByText(/future/i)
	const input = screen.getByLabelText(/new value/i)
	const submit = screen.getByRole('button', { name: /submit/i })
	const undo = screen.getByRole('button', { name: /undo/i })
	const redo = screen.getByRole('button', { name: /redo/i })

	// assert initial state
	await expect.element(undo).toBeDisabled()
	await expect.element(redo).toBeDisabled()
	await expect.element(past).toHaveTextContent('Past:')
	await expect.element(present).toHaveTextContent('Present: one')
	await expect.element(future).toHaveTextContent('Future:')

	// add second value
	await input.fill('two')
	await submit.click()

	// assert new state
	await expect.element(undo).toBeEnabled()
	await expect.element(redo).toBeDisabled()
	await expect.element(past).toHaveTextContent('Past: one')
	await expect.element(present).toHaveTextContent('Present: two')
	await expect.element(future).toHaveTextContent('Future:')

	// add third value
	await input.fill('three')
	await submit.click()

	// assert new state
	await expect.element(undo).toBeEnabled()
	await expect.element(redo).toBeDisabled()
	await expect.element(past).toHaveTextContent('Past: one, two')
	await expect.element(present).toHaveTextContent('Present: three')
	await expect.element(future).toHaveTextContent('Future:')

	// undo
	await undo.click()

	// assert "undone" state
	await expect.element(undo).toBeEnabled()
	await expect.element(redo).toBeEnabled()
	await expect.element(past).toHaveTextContent('Past: one')
	await expect.element(present).toHaveTextContent('Present: two')
	await expect.element(future).toHaveTextContent('Future: three')

	// undo again
	await undo.click()

	// assert "double-undone" state
	await expect.element(undo).toBeDisabled()
	await expect.element(redo).toBeEnabled()
	await expect.element(past).toHaveTextContent('Past:')
	await expect.element(present).toHaveTextContent('Present: one')
	await expect.element(future).toHaveTextContent('Future: two, three')

	// redo
	await redo.click()

	// assert undo + undo + redo state
	await expect.element(undo).toBeEnabled()
	await expect.element(redo).toBeEnabled()
	await expect.element(past).toHaveTextContent('Past: one')
	await expect.element(present).toHaveTextContent('Present: two')
	await expect.element(future).toHaveTextContent('Future: three')

	// add fourth value
	await input.fill('four')
	await submit.click()

	// assert final state (note the lack of "third")
	await expect.element(undo).toBeEnabled()
	await expect.element(redo).toBeDisabled()
	await expect.element(past).toHaveTextContent('Past: one, two')
	await expect.element(present).toHaveTextContent('Present: four')
	await expect.element(future).toHaveTextContent('Future:')
})
