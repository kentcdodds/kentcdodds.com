export async function loader() {
	return fetch(
		'https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server',
	)
}
