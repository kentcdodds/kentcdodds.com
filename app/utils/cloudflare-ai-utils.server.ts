import { getEnv } from './env.server.ts'

type WorkersAiRunUrlOptions = {
	model: string
	accountId?: string
	gatewayId?: string
}

export function getWorkersAiRunUrl(options: string | WorkersAiRunUrlOptions) {
	const { model, accountId, gatewayId } =
		typeof options === 'string' ? { model: options } : options
	// Cloudflare's REST route expects the model as path segments (with `/`), so do
	// not URL-encode the model string (encoding can yield "No route for that URI").
	const env = getEnv()
	const resolvedAccountId = accountId ?? env.CLOUDFLARE_ACCOUNT_ID
	const resolvedGatewayId = gatewayId ?? env.CLOUDFLARE_AI_GATEWAY_ID
	return `https://gateway.ai.cloudflare.com/v1/${resolvedAccountId}/${resolvedGatewayId}/workers-ai/${model}`
}

export function unwrapWorkersAiText(result: any): string | null {
	if (!result) return null
	if (typeof result === 'string') return result
	if (typeof result.response === 'string') return result.response
	if (typeof result.output === 'string') return result.output
	if (typeof result.text === 'string') return result.text

	// OpenAI-ish shape (some models / gateways).
	const choiceContent = result?.choices?.[0]?.message?.content
	if (typeof choiceContent === 'string') return choiceContent

	return null
}
