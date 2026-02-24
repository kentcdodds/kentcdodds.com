import { render, screen, act } from '@testing-library/react'
import * as React from 'react'
import { test, expect } from 'vitest'

function ImperativeCounter(props) {
	const [count, setCount] = React.useState(0)
	React.useImperativeHandle(props.ref, () => ({
		increment: () => setCount((c) => c + 1),
		decrement: () => setCount((c) => c - 1),
	}))
	return <div>The count is: {count}</div>
}

test('can call imperative methods on counter component', () => {
	const counterRef = React.createRef()
	render(<ImperativeCounter ref={counterRef} />)
	expect(screen.getByText('The count is: 0')).toBeInTheDocument()
	act(() => counterRef.current.increment())
	expect(screen.getByText('The count is: 1')).toBeInTheDocument()
	act(() => counterRef.current.decrement())
	expect(screen.getByText('The count is: 0')).toBeInTheDocument()
})

/*
eslint
  no-console: "off",
  no-func-assign: "off"
*/
