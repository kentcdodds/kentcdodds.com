import { timingSafeEqual } from 'node:crypto'
import { Container, getContainer } from '@cloudflare/containers'

export class CallKentAudioContainer extends Container {
	defaultPort = 8788
	sleepAfter = '1m'
}

type Env = {
	AUDIO_CONTAINER: any
	R2_ENDPOINT: string
	R2_ACCESS_KEY_ID: string
	R2_SECRET_ACCESS_KEY: string
	CALL_KENT_R2_BUCKET: string
	CALL_KENT_AUDIO_CONTAINER_TOKEN: string
}

function getBearerToken(authorizationHeader: string | null) {
	return authorizationHeader?.slice('Bearer '.length) ?? ''
}

function timingSafeEqualString(left: string, right: string) {
	const leftBuffer = Buffer.from(left)
	const rightBuffer = Buffer.from(right)
	if (leftBuffer.length !== rightBuffer.length) {
		return false
	}
	return timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(request: Request, env: Env) {
	return timingSafeEqualString(
		getBearerToken(request.headers.get('authorization')),
		env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
	)
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)
		const container = getContainer(env.AUDIO_CONTAINER, 'call-kent-audio')

		if (url.pathname === '/internal/heartbeat') {
			if (!isAuthorized(request, env)) {
				return new Response('Unauthorized', { status: 401 })
			}

			const statusResponse = await container.containerFetch(
				'/internal/status',
				{
					headers: {
						Authorization: `Bearer ${env.CALL_KENT_AUDIO_CONTAINER_TOKEN}`,
					},
				},
			)
			if (!statusResponse.ok) {
				const text = await statusResponse.text().catch(() => '')
				return new Response(
					`Heartbeat failed: ${statusResponse.status} ${statusResponse.statusText}${text ? `\n${text}` : ''}`,
					{ status: 502 },
				)
			}

			const { activeJobs } = (await statusResponse.json()) as {
				activeJobs: number
			}
			return Response.json({ ok: true, status: 'renewed', activeJobs })
		}

		if (url.pathname === '/internal/shutdown-if-idle') {
			if (!isAuthorized(request, env)) {
				return new Response('Unauthorized', { status: 401 })
			}
			const state = await container.getState()
			if (
				state.status === 'stopped' ||
				state.status === 'stopped_with_code' ||
				state.status === 'stopping'
			) {
				return Response.json({ ok: true, status: 'already-stopped' })
			}

			const statusResponse = await container.containerFetch(
				'/internal/status',
				{
					headers: {
						Authorization: `Bearer ${env.CALL_KENT_AUDIO_CONTAINER_TOKEN}`,
					},
				},
			)
			if (!statusResponse.ok) {
				const text = await statusResponse.text().catch(() => '')
				return new Response(
					`Status check failed: ${statusResponse.status} ${statusResponse.statusText}${text ? `\n${text}` : ''}`,
					{ status: 502 },
				)
			}

			const { activeJobs } = (await statusResponse.json()) as {
				activeJobs: number
			}
			if (activeJobs > 0) {
				return Response.json({
					ok: true,
					status: 'busy',
					activeJobs,
				})
			}

			await container.stop()
			return Response.json({ ok: true, status: 'stopped' })
		}

		if (url.pathname !== '/jobs/episode-audio-sync') {
			return new Response('Not found', { status: 404 })
		}

		await container.startAndWaitForPorts({
			startOptions: {
				envVars: {
					PORT: '8788',
					R2_ENDPOINT: env.R2_ENDPOINT,
					R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
					R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
					CALL_KENT_R2_BUCKET: env.CALL_KENT_R2_BUCKET,
					CALL_KENT_AUDIO_CONTAINER_TOKEN: env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
					CALL_KENT_AUDIO_CONTAINER_HEARTBEAT_URL: `${url.origin}/internal/heartbeat`,
					CALL_KENT_AUDIO_CONTAINER_SHUTDOWN_URL: `${url.origin}/internal/shutdown-if-idle`,
				},
			},
		})

		return container.fetch(request)
	},
}
