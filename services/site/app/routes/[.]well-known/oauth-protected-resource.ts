import { data as json } from 'react-router'

export async function loader() {
	const result = await fetch(
		'https://kcd-oauth-provider.kentcdodds.workers.dev/.well-known/oauth-protected-resource',
	)
	if (!result.ok) {
		return result
	}

	const data = await result.json()

	return json(data)
}
