import * as React from 'react'
import { test, expect } from 'vitest'
import { render } from 'vitest-browser-react'

function ImperativeCounter(props) {
	const [count, setCount] = React.useState(0)
	React.useImperativeHandle(props.ref, () => ({
		increment: () => setCount((c) => c + 1),
		decrement: () => setCount((c) => c - 1),
	}))
	return <div>The count is: {count}</div>
}

test('can call imperative methods on counter component', async () => {
	const counterRef = React.createRef()
	const screen = await render(<ImperativeCounter ref={counterRef} />)

	await expect.element(screen.getByText('The count is: 0')).toBeVisible()
	counterRef.current.increment()
	await expect.element(screen.getByText('The count is: 1')).toBeVisible()
	counterRef.current.decrement()
	await expect.element(screen.getByText('The count is: 0')).toBeVisible()
})
