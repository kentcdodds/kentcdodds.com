import { data as json } from 'react-router'

const authorizationServers = [
	'https://kcd-oauth-provider.kentcdodds.workers.dev',
] as const

const scopesSupported = ['mcp:tools'] as const

export async function loader({ request }: { request: Request }) {
	const url = new URL(request.url)
	const resourcePath = normalizeResourcePath(url.pathname)
	const resource =
		resourcePath === '/' ? url.origin : `${url.origin}${resourcePath}`

	return json({
		resource,
		authorization_servers: [...authorizationServers],
		scopes_supported: [...scopesSupported],
		bearer_methods_supported: ['header'],
		resource_name:
			resourcePath === '/mcp' ? 'KCD MCP server' : 'kentcdodds.com APIs',
	})
}

function normalizeResourcePath(pathname: string) {
	const prefix = '/.well-known/oauth-protected-resource'
	const suffix = pathname.slice(prefix.length)

	if (!suffix || suffix === '/') return '/'
	return suffix.startsWith('/') ? suffix : `/${suffix}`
}
