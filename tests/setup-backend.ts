import { afterEach, vi } from 'vitest'
import './setup-env.ts'

afterEach(() => {
	// Ensure one test's spies/mocks never leak into the next.
	// Vitest auto-clears between files, but this keeps per-test behavior strict.
	vi.restoreAllMocks()
})
