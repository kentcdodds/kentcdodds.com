import { afterAll, afterEach, beforeAll } from 'vitest'
import './setup-env.ts'
import { mswServer } from './msw-server.ts'

beforeAll(() => {
	mswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(async () => {
	mswServer.resetHandlers()
	const { resetCloudflareMockState } = await import('#mocks/cloudflare.ts')
	const { resetSearchWorkerMockState } = await import('#mocks/search-worker.ts')
	resetCloudflareMockState()
	resetSearchWorkerMockState()
})

afterAll(() => {
	mswServer.close()
})
