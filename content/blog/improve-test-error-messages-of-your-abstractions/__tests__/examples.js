const add = (a, b) => a + b

function assertAdd(inputs, output) {
  try {
    expect(add(...inputs)).toBe(output)
  } catch (error) {
    Error.captureStackTrace(error, assertAdd)
    throw error
  }
}

test('sums numbers', () => {
  assertAdd([1, 2], 3)
})
