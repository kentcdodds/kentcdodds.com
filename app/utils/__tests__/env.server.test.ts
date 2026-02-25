import { expect, test } from 'vitest'
import {
	clearRuntimeEnvSource,
	getEnv,
	setRuntimeEnvSource,
} from '../env.server.ts'

test('setRuntimeEnvSource overrides env values for getEnv', () => {
	const baseline = getEnv()

	setRuntimeEnvSource({
		FLY_MACHINE_ID: 'worker-instance-123',
		MOCKS: 'false',
	})
	const overridden = getEnv()

	expect(overridden.FLY_MACHINE_ID).toBe('worker-instance-123')
	expect(overridden.MOCKS).toBe(false)
	expect(overridden.PORT).toBe(baseline.PORT)

	clearRuntimeEnvSource()
	const restored = getEnv()
	expect(restored.FLY_MACHINE_ID).toBe(baseline.FLY_MACHINE_ID)
	expect(restored.MOCKS).toBe(baseline.MOCKS)
})
