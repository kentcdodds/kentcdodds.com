function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init)
}

function requiredHeader(headers: Headers, name: string) {
	const value = headers.get(name)
	if (!value) {
		throw new Error(`${name} header is required`)
	}
	return value
}

function requiredParam(params: URLSearchParams, name: string) {
	const value = params.get(name)
	if (!value) {
		throw new Error(`${name} param is required`)
	}
	return value
}

export async function maybeHandleDiscordMockFetch(request: Request) {
	const url = new URL(request.url)
	if (url.hostname !== 'discord.com') return null

	if (request.method === 'POST' && url.pathname === '/api/oauth2/token') {
		const body = await request.text()
		if (
			request.headers.get('Content-Type') !==
			'application/x-www-form-urlencoded'
		) {
			return json({ error: 'invalid content type' }, { status: 400 })
		}
		const params = new URLSearchParams(body)
		requiredParam(params, 'client_id')
		requiredParam(params, 'client_secret')
		requiredParam(params, 'grant_type')
		requiredParam(params, 'redirect_uri')
		requiredParam(params, 'scope')
		return json({
			token_type: 'test_token_type',
			access_token: 'test_access_token',
		})
	}

	if (request.method === 'GET' && /^\/api\/users\/[^/]+$/.test(url.pathname)) {
		requiredHeader(request.headers, 'Authorization')
		return json({
			id: 'test_discord_id',
			username: 'test_discord_username',
			discriminator: '0000',
		})
	}

	if (/^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)) {
		requiredHeader(request.headers, 'Authorization')

		if (request.method === 'GET') {
			const userId = url.pathname.split('/').at(-1) ?? 'test_discord_id'
			const user = {
				id: userId,
				username: `${userId}username`,
				discriminator: '0000',
			}
			return json({
				user,
				roles: [],
				...user,
			})
		}

		if (request.method === 'PUT') {
			const body = (await request.json()) as { access_token?: string }
			if (!body?.access_token) {
				return json({ error: 'access_token required' }, { status: 400 })
			}
			return json({})
		}

		if (request.method === 'PATCH') {
			const body = (await request.json()) as { roles?: Array<string> }
			if (!body || !Array.isArray(body.roles) || body.roles.length < 1) {
				return json({ error: 'roles required' }, { status: 400 })
			}
			return json({})
		}
	}

	if (
		request.method === 'POST' &&
		/^\/api\/channels\/[^/]+\/messages$/.test(url.pathname)
	) {
		requiredHeader(request.headers, 'Authorization')
		const channelId = url.pathname.split('/')[3] ?? 'unknown'
		let body: { content?: unknown } | null = null
		try {
			body = (await request.json()) as { content?: unknown }
		} catch {
			return json(
				{ error: 'Request body must be a JSON object' },
				{ status: 400 },
			)
		}
		if (!body || typeof body !== 'object') {
			return json(
				{ error: 'Request body must be a JSON object' },
				{ status: 400 },
			)
		}

		console.log(`🤖 Sending bot message to ${channelId}:\n`, body.content)

		return json({})
	}

	return null
}
