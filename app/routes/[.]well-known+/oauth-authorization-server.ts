import { json } from '@remix-run/router'

export async function loader() {
	const result = await fetch(
		'https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-authorization-server',
	)
	if (!result.ok) {
		return result
	}

	const data = await result.json()

	return json(data)
}
