import { expect, test, vi } from 'vitest'
import {
	applyPasswordSubmissionDelay,
	getPasswordSubmissionDelayMs,
} from '../password.server.ts'

test('getPasswordSubmissionDelayMs clamps non-positive maxMs to 0', () => {
	const randomInt = vi.fn(() => 123)

	expect(getPasswordSubmissionDelayMs({ maxMs: 0, randomInt })).toBe(0)
	expect(getPasswordSubmissionDelayMs({ maxMs: -5, randomInt })).toBe(0)

	expect(randomInt).not.toHaveBeenCalled()
})

test('getPasswordSubmissionDelayMs treats non-finite maxMs as 0', () => {
	const randomInt = vi.fn(() => 123)

	expect(getPasswordSubmissionDelayMs({ maxMs: Number.NaN, randomInt })).toBe(0)
	expect(
		getPasswordSubmissionDelayMs({
			maxMs: Number.POSITIVE_INFINITY,
			randomInt,
		}),
	).toBe(0)

	expect(randomInt).not.toHaveBeenCalled()
})

test('getPasswordSubmissionDelayMs caps maxMs to crypto.randomInt range', () => {
	const randomInt = vi.fn(() => 0)
	void getPasswordSubmissionDelayMs({ maxMs: 2 ** 48, randomInt })
	expect(randomInt).toHaveBeenCalledWith(0, 2 ** 48 - 1)
})

test('getPasswordSubmissionDelayMs uses an inclusive upper bound', () => {
	const randomInt = vi.fn(() => 42)

	expect(getPasswordSubmissionDelayMs({ maxMs: 250, randomInt })).toBe(42)
	expect(randomInt).toHaveBeenCalledWith(0, 251)
})

test('applyPasswordSubmissionDelay resolves immediately when maxMs is 0', async () => {
	vi.useFakeTimers()
	const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
	setTimeoutSpy.mockClear()
	try {
		const randomInt = vi.fn()
		await applyPasswordSubmissionDelay({ maxMs: 0, randomInt })
		expect(randomInt).not.toHaveBeenCalled()
		expect(setTimeoutSpy).not.toHaveBeenCalled()
	} finally {
		setTimeoutSpy.mockRestore()
		vi.useRealTimers()
	}
})

test('applyPasswordSubmissionDelay waits for the sampled delay', async () => {
	vi.useFakeTimers()
	try {
		const randomInt = vi.fn(() => 40)
		let resolved = false
		const promise = applyPasswordSubmissionDelay({ maxMs: 250, randomInt }).then(
			() => {
				resolved = true
			},
		)

		await vi.advanceTimersByTimeAsync(39)
		expect(resolved).toBe(false)

		await vi.advanceTimersByTimeAsync(1)
		await promise
		expect(resolved).toBe(true)
	} finally {
		vi.useRealTimers()
	}
})

