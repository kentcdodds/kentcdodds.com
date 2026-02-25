import { getEnv } from '#app/utils/env.server.ts'

export async function getOEmbed(url: string): Promise<any> {
	const endpoint = new URL(
		'oembed',
		`${getEnv().TWITTER_OEMBED_BASE_URL.replace(/\/+$/, '')}/`,
	)
	endpoint.searchParams.set('url', url)
	const res = await fetch(endpoint)

	if (res.ok) return res.json()
	if (res.status === 404) return

	throw new Error(`Fetch for embedded tweet failed with code: ${res.status}`)
}
