import * as React from 'react'
import {render, screen, act} from '@testing-library/react'

function ImperativeCounter(props, ref) {
  const [count, setCount] = React.useState(0)
  React.useImperativeHandle(ref, () => ({
    increment: () => setCount(c => c + 1),
    decrement: () => setCount(c => c - 1),
  }))
  return <div>The count is: {count}</div>
}
ImperativeCounter = React.forwardRef(ImperativeCounter)

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
