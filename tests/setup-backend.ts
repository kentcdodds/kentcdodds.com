import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetCloudflareMockState } from '#mocks/cloudflare.ts'
import './setup-env.ts'
import { mswServer } from './msw-server.ts'

beforeAll(() => {
	mswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
	mswServer.resetHandlers()
	resetCloudflareMockState()
})

afterAll(() => {
	mswServer.close()
})
