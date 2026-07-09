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
	to: string,
): Record<string, string> {
	const fixture: Record<string, string> = { to }
	if (body.from) fixture.from = body.from
	if (body.reply_to) fixture.replyTo = body.reply_to
	if (body.subject) fixture.subject = body.subject
	if (body.text) fixture.text = body.text
	if (typeof body.html === 'string') fixture.html = body.html
	return fixture
}

function recipientsFromBody(body: EmailSendingRequestBody): Array<string> {
	if (typeof body.to === 'string') return [body.to]
	if (Array.isArray(body.to)) return body.to
	return []
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
	const delivered = recipientsFromBody(body)
	for (const to of delivered) {
		const fixture = emailBodyToFixture(body, to)
		// Single log site for mocked emails (dev sidecar + MSW capture callbacks
		// must not log again).
		console.info('🔶 mocked email contents:', fixture)
		await options.onOutboundEmail?.(fixture)
	}
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
