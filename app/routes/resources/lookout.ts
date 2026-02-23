import { invariantResponse } from '@epic-web/invariant'
import { getEnv } from '#app/utils/env.server.ts'
import  { type Route } from './+types/lookout'
// this is a Sentry tunnel to proxy sentry requests so we don't get blocked by ad-blockers


export async function action({ request }: Route.ActionArgs) {
	const env = getEnv()
	// `start:mocks` (used in CI + local e2e) runs with `NODE_ENV=production` and
	// `MOCKS=true`. In that mode we don't want/need to proxy Sentry envelopes to
	// the real upstream ingest API.
	if (env.MOCKS) {
		// Drain the body to avoid hanging the underlying connection.
		await request.text().catch(() => '')
		return new Response(null, { status: 204 })
	}

	const sentryHost = (() => {
		const dsn = env.SENTRY_DSN
		if (!dsn) return null
		try {
			return new URL(dsn).hostname
		} catch {
			return null
		}
	})()
	const sentryProjectIds = env.SENTRY_PROJECT_ID ? [env.SENTRY_PROJECT_ID] : []

	if (!sentryHost) {
		throw new Response('Sentry is not configured', { status: 404 })
	}

	const envelope = await request.text()
	const piece = envelope.split('\n')[0]
	invariantResponse(piece, 'no piece in envelope')

	// Validate that the first line is valid JSON (required for Sentry envelope format)
	let header: any
	try {
		header = JSON.parse(piece)
	} catch {
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
	} catch {
		throw new Response('Invalid Sentry envelope format: invalid dsn URL', {
			status: 400,
		})
	}

	const projectId = dsn.pathname.slice(1)

	invariantResponse(
		dsn.hostname === sentryHost,
		`Invalid sentry hostname: ${dsn.hostname}`,
	)
	invariantResponse(
		projectId && sentryProjectIds.includes(projectId),
		`Invalid sentry project id: ${projectId}`,
	)

	const upstreamSentryURL = `https://${sentryHost}/api/${projectId}/envelope/`
	try {
		return await fetch(upstreamSentryURL, {
			method: 'POST',
			body: envelope,
			signal: AbortSignal.timeout(5_000),
		})
	} catch {
		throw new Response('Failed to proxy request to Sentry', { status: 502 })
	}
}
