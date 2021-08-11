import * as React from 'react'
import user from '@testing-library/user-event'
import {
  render,
  screen,
  waitForElementToBeRemoved,
  act,
} from '@testing-library/react'
import {UsernameForm} from '../components.jsx'

jest.mock('../api')

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
})

test('calls updateUsername with the new username (with act warning)', async () => {
  const handleUpdateUsername = jest.fn()
  const fakeUsername = 'sonicthehedgehog'

  render(<UsernameForm updateUsername={handleUpdateUsername} />)

  const usernameInput = screen.getByLabelText(/username/i)
  user.type(usernameInput, fakeUsername)
  user.click(screen.getByText(/submit/i))

  expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
})

test('calls updateUsername with the new username', async () => {
  const handleUpdateUsername = jest.fn(() => Promise.resolve())
  const fakeUsername = 'sonicthehedgehog'

  render(<UsernameForm updateUsername={handleUpdateUsername} />)

  const usernameInput = screen.getByLabelText(/username/i)
  user.type(usernameInput, fakeUsername)
  user.click(screen.getByText(/submit/i))

  expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
  await waitForElementToBeRemoved(() => screen.queryByText(/saving/i))
})

test('calls updateUsername with the new username (with manual act and promise)', async () => {
  const promise = Promise.resolve()
  const handleUpdateUsername = jest.fn(() => promise)
  const fakeUsername = 'sonicthehedgehog'

  render(<UsernameForm updateUsername={handleUpdateUsername} />)

  const usernameInput = screen.getByLabelText(/username/i)
  user.type(usernameInput, fakeUsername)
  user.click(screen.getByText(/submit/i))

  expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
  await act(() => promise)
})

/*
eslint
  no-console: "off"
*/
