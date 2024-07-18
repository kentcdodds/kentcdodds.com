import { type LoaderFunctionArgs } from '@remix-run/node'
import { getPostJson } from '#app/utils/blog.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const data = await getPostJson(request)
	const string = JSON.stringify(data)
	return new Response(string, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': String(Buffer.byteLength(string)),
		},
	})
}
