import { getPostJson } from '#app/utils/blog.server.ts'
import { type Route } from './+types/blog[.]json'

export async function loader({ request }: Route.LoaderArgs) {
	const data = await getPostJson(request)
	const string = JSON.stringify(data)
	return new Response(string, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': String(Buffer.byteLength(string)),
		},
	})
}
