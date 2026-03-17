import { afterAll, afterEach, beforeAll } from 'vitest'
import './setup-env.ts'
import { mswServer } from './msw-server.ts'

beforeAll(() => {
	mswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(async () => {
	mswServer.resetHandlers()
	const { resetCloudflareMockState } = await import('#mocks/cloudflare.ts')
	const { resetLexicalSearchWorkerMockState } = await import(
		'#mocks/lexical-search-worker.ts'
	)
	resetCloudflareMockState()
	resetLexicalSearchWorkerMockState()
})

afterAll(() => {
	mswServer.close()
})
