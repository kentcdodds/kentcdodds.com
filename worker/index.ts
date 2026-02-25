export default {
	async fetch(request: Request) {
		const url = new URL(request.url)
		if (url.pathname === '/health') {
			return Response.json({ ok: true, runtime: 'cloudflare-worker' })
		}

		return new Response('Cloudflare worker scaffold is ready.', {
			headers: { 'content-type': 'text/plain; charset=utf-8' },
		})
	},
}
