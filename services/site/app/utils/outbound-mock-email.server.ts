export type OutboundEmailMockOptions = {
	onOutboundEmail?: (body: Record<string, string>) => void | Promise<void>
}

type EmailSendingRequestBody = {
	to?: string | Array<string>
	from?: string
	subject?: string
	text?: string
	html?: string | null
	reply_to?: string
}

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function emailBodyToFixture(
	body: EmailSendingRequestBody,
): Record<string, string> | null {
	const toRaw = body.to
	const to =
		typeof toRaw === 'string'
			? toRaw
			: Array.isArray(toRaw)
				? toRaw[0]
				: undefined
	if (!to) return null

	const fixture: Record<string, string> = { to }
	if (body.from) fixture.from = body.from
	if (body.reply_to) fixture.replyTo = body.reply_to
	if (body.subject) fixture.subject = body.subject
	if (body.text) fixture.text = body.text
	if (typeof body.html === 'string') fixture.html = body.html
	return fixture
}

export async function maybeHandleEmailMockFetch(
	request: Request,
	options: OutboundEmailMockOptions = {},
) {
	const url = new URL(request.url)
	if (url.hostname !== 'api.cloudflare.com') return null
	if (request.method !== 'POST') return null
	if (
		!/^\/client\/v4\/accounts\/[^/]+\/email\/sending\/send$/.test(url.pathname)
	) {
		return null
	}

	const body = (await request.json()) as EmailSendingRequestBody
	const fixture = emailBodyToFixture(body)
	if (fixture?.to) {
		// Single log site for mocked emails (dev sidecar + MSW capture callbacks
		// must not log again).
		console.info('🔶 mocked email contents:', fixture)
		await options.onOutboundEmail?.(fixture)
	}
	const delivered =
		typeof body.to === 'string'
			? [body.to]
			: Array.isArray(body.to)
				? body.to
				: []
	return json({
		success: true,
		errors: [],
		messages: [],
		result: {
			delivered,
			permanent_bounces: [],
			queued: [],
		},
	})
}
