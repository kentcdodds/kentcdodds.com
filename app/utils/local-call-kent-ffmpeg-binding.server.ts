import { remember } from '@epic-web/remember'

type LocalCallKentFfmpegBinding = {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export const getLocalCallKentFfmpegBinding = remember(
	'local-call-kent-ffmpeg-binding',
	createLocalCallKentFfmpegBinding,
)

function createLocalCallKentFfmpegBinding(): LocalCallKentFfmpegBinding {
	const configuredBaseUrl =
		process.env.CALL_KENT_FFMPEG_BINDING_BASE_URL?.trim() ||
		'http://localhost:8804'
	const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '')

	return {
		fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
			const request = new Request(input, init)
			const requestedUrl = new URL(request.url)
			const targetUrl = new URL(
				`${requestedUrl.pathname}${requestedUrl.search}`,
				`${normalizedBaseUrl}/`,
			)
			return fetch(new Request(targetUrl.toString(), request))
		},
	}
}
