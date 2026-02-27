import { expect, test } from 'vitest'
import {
	clearRuntimeEnvSource,
	getEnv,
	setRuntimeEnvSource,
} from '../env.server.ts'

test('setRuntimeEnvSource overrides env values for getEnv', () => {
	const baseline = getEnv()

	setRuntimeEnvSource({
		ALLOWED_ACTION_ORIGINS: 'https://example.com,https://preview.example.com',
		MOCKS: 'false',
	})
	const overridden = getEnv()

	expect(overridden.allowedActionOrigins).toEqual([
		'https://example.com',
		'https://preview.example.com',
	])
	expect(overridden.MOCKS).toBe(false)
	expect(overridden.PORT).toBe(baseline.PORT)

	clearRuntimeEnvSource()
	const restored = getEnv()
	expect(restored.allowedActionOrigins).toEqual(baseline.allowedActionOrigins)
	expect(restored.MOCKS).toBe(baseline.MOCKS)
})
