import { describe, expect, test, vi } from 'vitest'
import { D1Rpc, D1RpcSession } from './d1-rpc.ts'
import type { ParentWorkerEnv } from './types.ts'

function createD1RpcHarness() {
	const boundParams: unknown[] = []
	const sessionBookmark = 'bookmark-from-session'
	const sessionPrepare = vi.fn().mockReturnValue({
		bind: vi.fn((...params: unknown[]) => {
			boundParams.push(...params)
			return {
				all: vi.fn().mockResolvedValue({
					results: [{ id: 'session-row' }],
					meta: {
						changes: 0,
						served_by_region: 'APAC',
						served_by_primary: false,
					},
				}),
			}
		}),
	})
	const session = {
		prepare: sessionPrepare,
		batch: vi.fn(),
		getBookmark: vi.fn().mockReturnValue(sessionBookmark),
	}
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
		APP_DB: {
			prepare,
			batch: vi.fn(),
			withSession: vi.fn().mockReturnValue(session),
		},
	} as unknown as ParentWorkerEnv
	const rpc = new D1Rpc({} as ExecutionContext, env)
	return { rpc, prepare, boundParams, session, sessionPrepare, sessionBookmark, env }
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

		const row = result.results?.[0]
		expect(row?.publicKey).toBeInstanceOf(ArrayBuffer)
		expect(new Uint8Array(row?.publicKey as ArrayBuffer)).toEqual(
			new Uint8Array([1, 2, 3]),
		)
		expect(row?.counter).toBe(42)
	})
})

describe('D1Rpc sessions', () => {
	test('createSession returns an RpcTarget with query and getBookmark', async () => {
		const { rpc, session, sessionPrepare, sessionBookmark, env } =
			createD1RpcHarness()

		const sessionStub = rpc.createSession('incoming-bookmark')
		expect(sessionStub).toBeInstanceOf(D1RpcSession)
		expect(env.APP_DB.withSession).toHaveBeenCalledWith('incoming-bookmark')

		const result = await sessionStub.query('select 1')
		expect(sessionPrepare).toHaveBeenCalledWith('select 1')
		expect(result.results?.[0]?.id).toBe('session-row')
		expect(result.meta?.served_by_region).toBe('APAC')
		expect(result.meta?.served_by_primary).toBe(false)
		expect(await sessionStub.getBookmark()).toBe(sessionBookmark)
	})

	test('createSession defaults to first-unconstrained', () => {
		const { rpc, env } = createD1RpcHarness()
		rpc.createSession()
		expect(env.APP_DB.withSession).toHaveBeenCalledWith('first-unconstrained')
	})

	test('sessionQuery returns bookmark metadata', async () => {
		const { rpc, env } = createD1RpcHarness()
		const result = await rpc.sessionQuery(
			'incoming-bookmark',
			'select 1',
		)
		expect(env.APP_DB.withSession).toHaveBeenCalledWith('incoming-bookmark')
		expect(result.bookmark).toBe('bookmark-from-session')
	})
})
