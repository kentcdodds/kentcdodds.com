import { render, screen, act } from '@testing-library/react'
import user from '@testing-library/user-event'
import { test, expect, vi } from 'vitest'
import { UsernameForm } from '../components.jsx'

vi.mock('../api')

function mockConsoleError() {
	return vi.spyOn(console, 'error').mockImplementation(() => {})
}

test('calls updateUsername with the new username (with act warning)', async () => {
	const consoleError = mockConsoleError()
	try {
		const handleUpdateUsername = vi.fn()
		const fakeUsername = 'sonicthehedgehog'

		render(<UsernameForm updateUsername={handleUpdateUsername} />)

		const usernameInput = screen.getByLabelText(/username/i)
		await user.type(usernameInput, fakeUsername)
		await user.click(screen.getByText(/submit/i))

		expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
	} finally {
		consoleError.mockRestore()
	}
})

function deferred() {
	let resolve, reject
	const promise = new Promise((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

test('calls updateUsername with the new username', async () => {
	const consoleError = mockConsoleError()
	try {
		const defer = deferred()
		const handleUpdateUsername = vi.fn(() => defer.promise)
		const fakeUsername = 'sonicthehedgehog'

		render(<UsernameForm updateUsername={handleUpdateUsername} />)

		const usernameInput = screen.getByLabelText(/username/i)
		await user.type(usernameInput, fakeUsername)
		const clickPromise = user.click(screen.getByText(/submit/i))
		expect(await screen.findByText(/saving/i)).toBeInTheDocument()
		expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
		await defer.resolve()
		await clickPromise
		// TODO: figure out why this is necessary with the latest testing lib version 😵
		await new Promise((res) => setTimeout(res, 0))
		expect(screen.queryByText(/saving/i)).not.toBeInTheDocument()
	} finally {
		consoleError.mockRestore()
	}
})

test('calls updateUsername with the new username (with manual act and promise)', async () => {
	const consoleError = mockConsoleError()
	try {
		const promise = Promise.resolve()
		const handleUpdateUsername = vi.fn(() => promise)
		const fakeUsername = 'sonicthehedgehog'

		render(<UsernameForm updateUsername={handleUpdateUsername} />)

		const usernameInput = screen.getByLabelText(/username/i)
		await user.type(usernameInput, fakeUsername)
		await user.click(screen.getByText(/submit/i))

		expect(handleUpdateUsername).toHaveBeenCalledWith(fakeUsername)
		await act(() => promise)
	} finally {
		consoleError.mockRestore()
	}
})

/*
eslint
  no-console: "off"
*/
