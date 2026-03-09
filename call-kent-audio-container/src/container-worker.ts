import { Container, getContainer } from '@cloudflare/containers'

export class CallKentAudioContainer extends Container {
	defaultPort = 8788
	sleepAfter = '5m'
}

type Env = {
	AUDIO_CONTAINER: any
	R2_ENDPOINT: string
	R2_ACCESS_KEY_ID: string
	R2_SECRET_ACCESS_KEY: string
	CALL_KENT_R2_BUCKET: string
	CALL_KENT_AUDIO_CONTAINER_TOKEN: string
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url)
		if (url.pathname !== '/jobs/episode-audio') {
			return new Response('Not found', { status: 404 })
		}

		const container = getContainer(env.AUDIO_CONTAINER, 'call-kent-audio')
		await container.startAndWaitForPorts({
			startOptions: {
				envVars: {
					PORT: '8788',
					R2_ENDPOINT: env.R2_ENDPOINT,
					R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
					R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
					CALL_KENT_R2_BUCKET: env.CALL_KENT_R2_BUCKET,
					CALL_KENT_AUDIO_CONTAINER_TOKEN: env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
				},
			},
		})

		return container.fetch(request)
	},
}
