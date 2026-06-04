// @vitest-environment node
import { Readable } from 'node:stream'
import { afterEach, expect, test, vi } from 'vitest'

const fsMocks = vi.hoisted(() => ({
	createReadStream: vi.fn(),
	promises: {
		stat: vi.fn(),
	},
}))

const sessionServerMocks = vi.hoisted(() => ({
	requireAdminUser: vi.fn(),
}))

const v8Mocks = vi.hoisted(() => ({
	writeHeapSnapshot: vi.fn(),
}))

vi.mock('node:fs', () => fsMocks)
vi.mock('node:v8', () => v8Mocks)
vi.mock('#app/utils/session.server.ts', () => sessionServerMocks)

import { loader } from '../heapsnapshot.ts'

afterEach(() => {
	vi.clearAllMocks()
	vi.unstubAllEnvs()
})

test('loader rejects heap snapshots outside Fly production Node', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.stubEnv('FLY_APP_NAME', '')
	vi.stubEnv('FLY_REGION', '')
	vi.stubEnv('FLY_MACHINE_ID', '')

	try {
		await loader({
			request: new Request('http://localhost/resources/heapsnapshot'),
		} as any)
		throw new Error('Expected loader to throw')
	} catch (error) {
		expect(error).toBeInstanceOf(Response)
		const response = error as Response
		expect(response.status).toBe(501)
		expect(await response.text()).toBe(
			'Heap snapshots are only available on Fly.io production Node diagnostics.',
		)
	}

	expect(sessionServerMocks.requireAdminUser).not.toHaveBeenCalled()
	expect(v8Mocks.writeHeapSnapshot).not.toHaveBeenCalled()
	expect(fsMocks.createReadStream).not.toHaveBeenCalled()
})

test('loader keeps Fly production heap snapshot behavior for admins', async () => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.stubEnv('FLY_APP_NAME', 'kcd')
	vi.stubEnv('FLY_REGION', 'dfw')
	vi.stubEnv('FLY_MACHINE_ID', 'machine-1')
	sessionServerMocks.requireAdminUser.mockResolvedValue({ id: 'admin' })
	v8Mocks.writeHeapSnapshot.mockReturnValue('/tmp/kcd.heapsnapshot')
	fsMocks.createReadStream.mockReturnValue(Readable.from(['snapshot']))
	fsMocks.promises.stat.mockResolvedValue({ size: 8 })

	const response = await loader({
		request: new Request('http://kentcdodds.com/resources/heapsnapshot'),
	} as any)

	expect(response.status).toBe(200)
	expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
	expect(response.headers.get('Content-Disposition')).toBe(
		'attachment; filename="kcd.heapsnapshot"',
	)
	expect(response.headers.get('Content-Length')).toBe('8')
	expect(sessionServerMocks.requireAdminUser).toHaveBeenCalledTimes(1)
	expect(
		sessionServerMocks.requireAdminUser.mock.invocationCallOrder[0],
	).toBeLessThan(v8Mocks.writeHeapSnapshot.mock.invocationCallOrder[0] ?? 0)
})
