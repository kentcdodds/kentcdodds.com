export type OutboundEmailMockOptions = {
	onOutboundEmail?: (body: Record<string, string>) => void | Promise<void>
}

type EmailSendingAddress =
	| string
	| {
			address: string
			name?: string | null
	  }

type EmailSendingRequestBody = {
	to?: EmailSendingAddress | Array<EmailSendingAddress>
	from?: EmailSendingAddress
	subject?: string
	text?: string
	html?: string | null
	reply_to?: EmailSendingAddress
}

function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function stringifyEmailSendingAddress(
	value: EmailSendingAddress | undefined,
): string | undefined {
	if (!value) return undefined
	if (typeof value === 'string') return value
	const name = value.name?.trim()
	if (!name) return value.address
	const escapedName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
	return `"${escapedName}" <${value.address}>`
}

function emailSendingAddressValue(value: EmailSendingAddress): string {
	return typeof value === 'string' ? value : value.address
}

function emailBodyToFixture(
	body: EmailSendingRequestBody,
	to: string,
): Record<string, string> {
	const fixture: Record<string, string> = { to }
	const from = stringifyEmailSendingAddress(body.from)
	if (from) fixture.from = from
	const replyTo = stringifyEmailSendingAddress(body.reply_to)
	if (replyTo) fixture.replyTo = replyTo
	if (body.subject) fixture.subject = body.subject
	if (body.text) fixture.text = body.text
	if (typeof body.html === 'string') fixture.html = body.html
	return fixture
}

function recipientsFromBody(body: EmailSendingRequestBody): Array<string> {
	if (Array.isArray(body.to)) return body.to.map(emailSendingAddressValue)
	if (body.to) return [emailSendingAddressValue(body.to)]
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
