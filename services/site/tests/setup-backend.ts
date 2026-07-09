import { afterAll, afterEach, beforeAll } from 'vitest'
import './setup-env.ts'
import { mswServer } from './msw-server.ts'

beforeAll(() => {
	mswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(async () => {
	mswServer.resetHandlers()
	const { resetTransistorMockState } = await import('#mocks/transistor.ts')
	const { resetCloudflareMockState } = await import('#mocks/cloudflare.ts')
	const { resetSearchWorkerMockState } = await import('#mocks/search-worker.ts')
	// Re-seed transistor before cloudflare so podcast search corpus rebuilds from fixtures.
	resetTransistorMockState()
	resetCloudflareMockState()
	resetSearchWorkerMockState()
})

afterAll(() => {
	mswServer.close()
})
