import { expect, test } from 'vitest'
import { setEnv } from '#tests/env-disposable.ts'
import { getX402MiddlewareConfig, getX402PublicConfig } from '../x402.server.ts'

test('x402 uses a demo wallet in development when none is configured', () => {
	using _ignoredEnv = setEnv({
		NODE_ENV: 'development',
		X402_WALLET_ADDRESS: undefined,
		X402_FACILITATOR_URL: undefined,
		X402_PRICE_USD: undefined,
	})

	const config = getX402PublicConfig()

	expect(config.enabled).toBe(true)
	expect(config.usingDemoWallet).toBe(true)
	expect(config.walletAddress).toBe('0x1111111111111111111111111111111111111111')
	expect(config.facilitatorUrl).toBe('https://x402.org/facilitator')
	expect(config.price).toBe('$0.01')
})

test('x402 stays disabled in production without a wallet address', () => {
	using _ignoredEnv = setEnv({
		NODE_ENV: 'production',
		X402_WALLET_ADDRESS: undefined,
		X402_FACILITATOR_URL: undefined,
		X402_PRICE_USD: undefined,
	})

	const config = getX402PublicConfig()

	expect(config.enabled).toBe(false)
	expect(config.usingDemoWallet).toBe(false)
	expect(config.walletAddress).toBeNull()
	expect(getX402MiddlewareConfig()).toBeNull()
})

test('x402 uses configured production values when present', () => {
	using _ignoredEnv = setEnv({
		NODE_ENV: 'production',
		X402_WALLET_ADDRESS: '0x2222222222222222222222222222222222222222',
		X402_FACILITATOR_URL: 'https://facilitator.example.com',
		X402_PRICE_USD: '$0.25',
	})

	const config = getX402PublicConfig()
	const middlewareConfig = getX402MiddlewareConfig()

	expect(config.enabled).toBe(true)
	expect(config.usingDemoWallet).toBe(false)
	expect(config.walletAddress).toBe('0x2222222222222222222222222222222222222222')
	expect(config.facilitatorUrl).toBe('https://facilitator.example.com')
	expect(config.price).toBe('$0.25')
	expect(middlewareConfig?.routeKey).toBe('GET /resources/x402/protected')
	expect(middlewareConfig?.accepts.payTo).toBe(
		'0x2222222222222222222222222222222222222222',
	)
})
