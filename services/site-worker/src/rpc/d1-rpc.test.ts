import { describe, expect, test, vi } from 'vitest'
import { D1Rpc } from './d1-rpc.ts'
import type { ParentWorkerEnv } from './types.ts'

function createD1RpcHarness() {
	const boundParams: unknown[] = []
	const prepare = vi.fn().mockReturnValue({
		bind: vi.fn((...params: unknown[]) => {
			boundParams.push(...params)
			return {
				all: vi.fn().mockResolvedValue({
					results: [
						{
							publicKey: new Uint8Array([1, 2, 3]).buffer,
							counter: 42,
						},
					],
					meta: { changes: 0 },
				}),
			}
		}),
	})
	const env = {
		APP_DB: { prepare },
	} as unknown as ParentWorkerEnv
	const rpc = new D1Rpc({} as ExecutionContext, env)
	return { rpc, prepare, boundParams }
}

describe('D1Rpc serialization', () => {
	test('round-trips ArrayBuffer params and bigint/COUNT results through query', async () => {
		const { rpc, prepare, boundParams } = createD1RpcHarness()
		const publicKey = new Uint8Array([9, 8, 7]).buffer

		const result = await rpc.query('select * from "Passkey" where id = ?', [
			'passkey-1',
			publicKey,
		])

		expect(prepare).toHaveBeenCalledWith(
			'select * from "Passkey" where id = ?',
		)
		expect(boundParams[0]).toBe('passkey-1')
		expect(boundParams[1]).toBeInstanceOf(ArrayBuffer)
		expect(new Uint8Array(boundParams[1] as ArrayBuffer)).toEqual(
			new Uint8Array([9, 8, 7]),
		)

		const row = result.results[0]
		expect(row?.publicKey).toBeInstanceOf(ArrayBuffer)
		expect(new Uint8Array(row?.publicKey as ArrayBuffer)).toEqual(
			new Uint8Array([1, 2, 3]),
		)
		expect(row?.counter).toBe(42)
	})
})
