import { maybeHandleCloudflareMockFetch } from './outbound-mock-cloudflare.server.ts'
import { maybeHandleDiscordMockFetch } from './outbound-mock-discord.server.ts'
import { maybeHandleEmailMockFetch } from './outbound-mock-email.server.ts'
import { maybeHandleKitMockFetch } from './outbound-mock-kit.server.ts'
import { maybeHandleMiscMockFetch } from './outbound-mock-misc.server.ts'
import { maybeHandleR2MockFetch } from './outbound-mock-r2.server.ts'
import { maybeHandleSearchWorkerMockFetch } from './outbound-mock-search-worker.server.ts'
import { maybeHandleTransistorMockFetch } from './outbound-mock-transistor.server.ts'

export type OutboundMockHandlerOptions = {
	onOutboundEmail?: (body: Record<string, string>) => void | Promise<void>
	searchWorkerUrl?: string
	searchWorkerToken?: string
}

export async function maybeHandleOutboundMockFetch(
	request: Request,
	options: OutboundMockHandlerOptions = {},
) {
	const searchWorker = await maybeHandleSearchWorkerMockFetch(request, {
		searchWorkerUrl: options.searchWorkerUrl,
		searchWorkerToken: options.searchWorkerToken,
	})
	if (searchWorker) return searchWorker

	const r2 = await maybeHandleR2MockFetch(request)
	if (r2) return r2

	const cloudflare = await maybeHandleCloudflareMockFetch(request)
	if (cloudflare) return cloudflare

	const transistor = await maybeHandleTransistorMockFetch(request)
	if (transistor) return transistor

	const kit = await maybeHandleKitMockFetch(request)
	if (kit) return kit

	const discord = await maybeHandleDiscordMockFetch(request)
	if (discord) return discord

	const email = await maybeHandleEmailMockFetch(request, {
		onOutboundEmail: options.onOutboundEmail,
	})
	if (email) return email

	return maybeHandleMiscMockFetch(request)
}
