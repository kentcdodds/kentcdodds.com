import { test, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
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

		const screen = await render(
			<UsernameForm updateUsername={handleUpdateUsername} />,
		)

		await screen.getByLabelText(/username/i).fill(fakeUsername)
		await screen.getByRole('button', { name: /submit/i }).click()

		await expect.poll(() => handleUpdateUsername.mock.calls[0]?.[0]).toBe(
			fakeUsername,
		)
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

		const screen = await render(
			<UsernameForm updateUsername={handleUpdateUsername} />,
		)

		await screen.getByLabelText(/username/i).fill(fakeUsername)
		await screen.getByRole('button', { name: /submit/i }).click()

		const saving = screen.getByText(/saving/i)
		await expect.element(saving).toBeVisible()
		await expect.poll(() => handleUpdateUsername.mock.calls[0]?.[0]).toBe(
			fakeUsername,
		)

		defer.resolve()
		await expect.poll(() => saving.query()).toBeNull()
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

		const screen = await render(
			<UsernameForm updateUsername={handleUpdateUsername} />,
		)

		await screen.getByLabelText(/username/i).fill(fakeUsername)
		await screen.getByRole('button', { name: /submit/i }).click()

		await expect.poll(() => handleUpdateUsername.mock.calls[0]?.[0]).toBe(
			fakeUsername,
		)
		await promise
	} finally {
		consoleError.mockRestore()
	}
})
