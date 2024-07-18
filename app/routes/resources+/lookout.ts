// this is a Sentry tunnel to proxy sentry requests so we don't get blocked by ad-blockers
import { type ActionFunctionArgs } from '@remix-run/node'
import { invariantResponse } from '#app/utils/misc.tsx'

const SENTRY_HOST = new URL(process.env.SENTRY_DSN).hostname
const SENTRY_PROJECT_IDS = [process.env.SENTRY_PROJECT_ID]

export async function action({ request }: ActionFunctionArgs) {
	const envelope = await request.text()
	const piece = envelope.split('\n')[0]
	invariantResponse(piece, 'no piece in envelope')

	const header = JSON.parse(piece ?? '{}')
	const dsn = new URL(header.dsn)
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
