import { getDomainUrl } from './misc.ts'

const apiCatalogMediaType = 'application/linkset+json'
const apiCatalogProfileUri = 'https://www.rfc-editor.org/info/rfc9727'

const homepageAgentDiscoveryLinks = [
	{
		href: '/.well-known/api-catalog',
		rel: 'api-catalog',
		type: apiCatalogMediaType,
		profile: apiCatalogProfileUri,
		title: 'kentcdodds.com API catalog',
	},
	{
		href: '/about-mcp',
		rel: 'service-doc',
		type: 'text/html; charset=UTF-8',
		title: 'MCP usage documentation',
	},
] as const

type HomepageAgentDiscoveryLink = (typeof homepageAgentDiscoveryLinks)[number]

function formatAgentDiscoveryLinkHeader(link: HomepageAgentDiscoveryLink) {
	const params = [`rel="${link.rel}"`, `type="${link.type}"`]
	if ('profile' in link) params.push(`profile="${link.profile}"`)
	if (link.title) params.push(`title="${link.title}"`)
	return `<${link.href}>; ${params.join('; ')}`
}

export function appendAgentDiscoveryHeaders(headers: Headers) {
	for (const link of homepageAgentDiscoveryLinks) {
		headers.append('Link', formatAgentDiscoveryLinkHeader(link))
	}
}

export function shouldAppendAgentDiscoveryHeaders(request: Request) {
	return new URL(request.url).pathname === '/'
}

export function appendApiCatalogHeaders(headers: Headers) {
	const apiCatalogLink = homepageAgentDiscoveryLinks.find(
		(link) => link.rel === 'api-catalog',
	)
	if (!apiCatalogLink) return
	headers.append('Link', formatAgentDiscoveryLinkHeader(apiCatalogLink))
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
