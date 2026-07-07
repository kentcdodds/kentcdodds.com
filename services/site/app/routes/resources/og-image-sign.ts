import { type ActionFunctionArgs, data as json } from 'react-router'
import { z } from 'zod'
import { buildOgImageUrl } from '#app/og/url.server.ts'
import { getOgImageSecret } from '#app/og/secrets.server.ts'
import { isOgTemplateName } from '#app/og/registry.tsx'
import { getDomainUrl } from '#app/utils/misc.ts'
import { requireUser } from '#app/utils/session.server.ts'

const signBodySchema = z.object({
	template: z.string(),
	params: z.record(z.string(), z.unknown()),
})

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}
	// Signing must not be public: a signed URL makes the worker render (and,
	// for avatar params, fetch) whatever the payload says. The only consumer
	// is the episode artwork preview on the (logged-in) call recording UI.
	await requireUser(request)

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 })
	}

	const parsed = signBodySchema.safeParse(body)
	if (!parsed.success || !isOgTemplateName(parsed.data.template)) {
		return json({ error: 'Invalid template or params' }, { status: 400 })
	}

	const origin = getDomainUrl(request)
	const url = buildOgImageUrl(
		origin,
		parsed.data.template,
		parsed.data.params,
		getOgImageSecret(),
	)

	return json({ url })
}
