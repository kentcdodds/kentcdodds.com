import { getDomainUrl } from './misc.ts'

const apiCatalogMediaType =
	'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'

const homepageAgentDiscoveryLinks = [
	{
		href: '/.well-known/api-catalog',
		rel: 'api-catalog',
		type: apiCatalogMediaType,
		title: 'kentcdodds.com API catalog',
	},
	{
		href: '/about-mcp',
		rel: 'service-doc',
		type: 'text/html; charset=UTF-8',
		title: 'MCP usage documentation',
	},
] as const

export function appendAgentDiscoveryHeaders(headers: Headers) {
	for (const link of homepageAgentDiscoveryLinks) {
		const params = [`rel="${link.rel}"`, `type="${link.type}"`]
		if (link.title) params.push(`title="${link.title}"`)
		headers.append('Link', `<${link.href}>; ${params.join('; ')}`)
	}
}

export function shouldAppendAgentDiscoveryHeaders(request: Request) {
	return new URL(request.url).pathname === '/'
}

export function appendApiCatalogHeaders(headers: Headers) {
	headers.append(
		'Link',
		`</.well-known/api-catalog>; rel="api-catalog"; type="${apiCatalogMediaType}"; title="kentcdodds.com API catalog"`,
	)
}

export function getAgentApiCatalog(request: Request) {
	const origin = getDomainUrl(request)
	return {
		linkset: [
			{
				anchor: `${origin}/.well-known/api-catalog`,
				item: [{ href: `${origin}/mcp` }],
			},
			{
				anchor: `${origin}/mcp`,
				'service-doc': [
					{
						href: `${origin}/about-mcp`,
						type: 'text/html',
					},
				],
				describedby: [
					{
						href: `${origin}/.well-known/oauth-protected-resource`,
						type: 'application/json',
					},
					{
						href: `${origin}/.well-known/oauth-authorization-server`,
						type: 'application/json',
					},
				],
			},
		],
	} as const
}
