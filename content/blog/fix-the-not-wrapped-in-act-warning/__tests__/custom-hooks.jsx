import * as React from 'react'
import {renderHook, act} from '@testing-library/react'

function useCount() {
  const [count, setCount] = React.useState(0)
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  return {count, increment, decrement}
}

test('increment and decrement updates the count', () => {
  const {result} = renderHook(() => useCount())

  expect(result.current.count).toBe(0)
  act(() => result.current.increment())
  expect(result.current.count).toBe(1)
  act(() => result.current.decrement())
  expect(result.current.count).toBe(0)
})

/*
eslint
  no-console: "off",
  no-func-assign: "off"
*/
