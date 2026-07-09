function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

export async function maybeHandleKitMockFetch(request: Request) {
	const url = new URL(request.url)
	if (url.hostname !== 'api.kit.com') return null

	if (request.method === 'GET' && url.pathname === '/v3/subscribers') {
		return json({
			total_subscribers: 0,
			page: 1,
			total_pages: 1,
			subscribers: [],
		})
	}

	if (
		request.method === 'GET' &&
		/^\/v3\/subscribers\/[^/]+\/tags$/.test(url.pathname)
	) {
		return json({
			tags: [
				{
					id: 1,
					name: 'Subscribed: general newsletter',
					created_at: '2021-06-09T17:54:22Z',
				},
			],
		})
	}

	if (
		request.method === 'POST' &&
		(/^\/v3\/forms\/[^/]+\/subscribe$/.test(url.pathname) ||
			/^\/v3\/tags\/[^/]+\/subscribe$/.test(url.pathname))
	) {
		const body = (await request.json()) as {
			first_name?: string
			email?: string
			fields?: Array<string>
		}
		const targetId = url.pathname.split('/')[3] ?? '0'
		const isForm = url.pathname.includes('/forms/')
		console.log(isForm ? 'Subscribing to form' : 'Subscribing to tag', {
			[isForm ? 'formId' : 'tagId']: targetId,
			body,
		})
		return json({
			subscription: {
				id: 1234567890,
				state: 'active',
				created_at: new Date().toJSON(),
				source: 'API::V3::SubscriptionsController (external)',
				referrer: null,
				subscribable_id: targetId,
				subscribable_type: isForm ? 'form' : 'tag',
				subscriber: {
					id: 987654321,
					first_name: body.first_name ?? 'Test',
					email_address: body.email ?? 'test@example.com',
					state: 'inactive',
					created_at: new Date().toJSON(),
					fields: body.fields ?? [],
				},
			},
		})
	}

	return null
}
