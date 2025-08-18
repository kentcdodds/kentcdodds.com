// this is a Sentry tunnel to proxy sentry requests so we don't get blocked by ad-blockers
import { type ActionFunctionArgs } from '@remix-run/node'
import { invariantResponse } from '#app/utils/misc.tsx'

const SENTRY_HOST = new URL(process.env.SENTRY_DSN).hostname
const SENTRY_PROJECT_IDS = [process.env.SENTRY_PROJECT_ID]

export async function action({ request }: ActionFunctionArgs) {
	const envelope = await request.text()
	const piece = envelope.split('\n')[0]
	invariantResponse(piece, 'no piece in envelope')

	// Validate that the first line is valid JSON (required for Sentry envelope format)
	let header: any
	try {
		header = JSON.parse(piece ?? '{}')
	} catch (error) {
		// Return 400 for malformed Sentry envelopes instead of crashing
		throw new Response(
			'Invalid Sentry envelope format: first line must be valid JSON',
			{
				status: 400,
			},
		)
	}

	// Validate that header contains required dsn field
	if (!header.dsn || typeof header.dsn !== 'string') {
		throw new Response(
			'Invalid Sentry envelope format: missing or invalid dsn field',
			{
				status: 400,
			},
		)
	}

	let dsn: URL
	try {
		dsn = new URL(header.dsn)
	} catch (error) {
		throw new Response('Invalid Sentry envelope format: invalid dsn URL', {
			status: 400,
		})
	}

	const projectId = dsn.pathname?.replace('/', '')

	invariantResponse(
		dsn.hostname === SENTRY_HOST,
		`Invalid sentry hostname: ${dsn.hostname}`,
	)
	invariantResponse(
		projectId && SENTRY_PROJECT_IDS.includes(projectId),
		`Invalid sentry project id: ${projectId}`,
	)

	const upstreamSentryURL = `https://${SENTRY_HOST}/api/${projectId}/envelope/`
	return fetch(upstreamSentryURL, { method: 'POST', body: envelope })
}
