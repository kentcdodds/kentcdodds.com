export type OutboundMockRoute = {
	host: string
	method?: string
	match: (url: URL) => boolean
}

export const PASSTHROUGH_HOSTS = new Set([
	'api.twitter.com',
	'cdn.syndication.twimg.com',
	'api.pwnedpasswords.com',
])

export const mockRoutes: OutboundMockRoute[] = [
	{
		host: 'api.mailgun.net',
		method: 'POST',
		match(url) {
			return /^\/v3\/[^/]+\/messages$/.test(url.pathname)
		},
	},
	{
		host: 'api.kit.com',
		match(url) {
			return url.pathname === '/v3/subscribers'
		},
	},
	{
		host: 'api.kit.com',
		match(url) {
			return /^\/v3\/subscribers\/[^/]+\/tags$/.test(url.pathname)
		},
	},
	{
		host: 'api.kit.com',
		method: 'POST',
		match(url) {
			return (
				/^\/v3\/forms\/[^/]+\/subscribe$/.test(url.pathname) ||
				/^\/v3\/tags\/[^/]+\/subscribe$/.test(url.pathname)
			)
		},
	},
	{
		host: 'discord.com',
		method: 'POST',
		match(url) {
			return url.pathname === '/api/oauth2/token'
		},
	},
	{
		host: 'discord.com',
		match(url) {
			return /^\/api\/users\/[^/]+$/.test(url.pathname)
		},
	},
	{
		host: 'discord.com',
		match(url) {
			return /^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		},
	},
	{
		host: 'discord.com',
		method: 'PUT',
		match(url) {
			return /^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		},
	},
	{
		host: 'discord.com',
		method: 'PATCH',
		match(url) {
			return /^\/api\/guilds\/[^/]+\/members\/[^/]+$/.test(url.pathname)
		},
	},
	{
		host: 'verifyright.co',
		match(url) {
			return /^\/verify\/[^/]+$/.test(url.pathname)
		},
	},
]
