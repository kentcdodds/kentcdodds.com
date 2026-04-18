import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { type Network } from '@x402/express'
import { getEnv } from '#app/utils/env.server.ts'

export const x402ProtectedPath = '/resources/x402/protected'
export const x402DemoPagePath = '/x402'
export const x402Network = 'eip155:84532' as Network
export const x402DefaultFacilitatorUrl = 'https://x402.org/facilitator'
export const x402DefaultPrice = '$0.01'
const x402DemoWalletAddress = '0x1111111111111111111111111111111111111111'

export type X402Config = {
	enabled: boolean
	walletAddress: `0x${string}` | null
	facilitatorUrl: string
	price: string
	network: Network
	path: string
	usingDemoWallet: boolean
}

function toWalletAddress(
	value: string | undefined | null,
): `0x${string}` | null {
	if (typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)) {
		return value as `0x${string}`
	}
	return null
}

export function getX402PublicConfig(): X402Config {
	const env = getEnv()
	const usingDemoWallet =
		env.NODE_ENV !== 'production' && !env.X402_WALLET_ADDRESS
	const walletAddress = toWalletAddress(
		env.X402_WALLET_ADDRESS ??
			(usingDemoWallet ? x402DemoWalletAddress : null),
	)

	return {
		enabled: walletAddress !== null,
		walletAddress,
		facilitatorUrl: env.X402_FACILITATOR_URL ?? x402DefaultFacilitatorUrl,
		price: env.X402_PRICE_USD ?? x402DefaultPrice,
		network: x402Network,
		path: x402ProtectedPath,
		usingDemoWallet,
	}
}

export function getX402MiddlewareConfig() {
	const config = getX402PublicConfig()

	if (!config.enabled || !config.walletAddress) {
		return null
	}

	const facilitatorClient = new HTTPFacilitatorClient({
		url: config.facilitatorUrl,
	})
	const resourceServer = new x402ResourceServer(facilitatorClient).register(
		config.network,
		new ExactEvmScheme(),
	)

	return {
		...config,
		endpointPath: config.path,
		routeKey: `GET ${config.path}`,
		description: 'Agent-native HTTP payment demo protected by x402 on Base Sepolia',
		accepts: {
			scheme: 'exact' as const,
			price: config.price,
			network: config.network,
			payTo: config.walletAddress,
		},
		server: resourceServer,
	}
}

export function buildX402ProtectedRouteResponse(requestPath: string) {
	const config = getX402PublicConfig()

	return {
		ok: true,
		message: 'x402 payment accepted. This is the protected response payload.',
		x402: {
			path: config.path,
			price: config.price,
			network: config.network,
			facilitatorUrl: config.facilitatorUrl,
		},
		resource: {
			id: 'kent-x402-demo',
			name: 'Kent x402 demo payload',
			description:
				'This JSON came from a route protected by x402 payment middleware.',
			deliveredAt: new Date().toISOString(),
			requestPath,
		},
		nextSteps: [
			'Make the same request from an x402-aware client.',
			'Let the client satisfy the PAYMENT-REQUIRED challenge.',
			'Retry with PAYMENT-SIGNATURE to receive this payload automatically.',
		],
	}
}
