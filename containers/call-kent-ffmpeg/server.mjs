import { createServer } from 'node:http'
import { stitchEpisodeAudio } from './ffmpeg-stitching.mjs'

const maxAudioBytes = 25 * 1024 * 1024

export function createCallKentFfmpegHandler({
	stitchAudio = stitchEpisodeAudio,
} = {}) {
	return async function handle(request) {
		const url = new URL(request.url)

		if (request.method === 'GET' && url.pathname === '/health') {
			return jsonResponse({ ok: true, service: 'call-kent-ffmpeg-container' })
		}

		if (request.method === 'POST' && url.pathname === '/episode-audio') {
			const formData = await request.formData()
			const callAudio = formData.get('callAudio')
			const responseAudio = formData.get('responseAudio')
			if (!(callAudio instanceof File) || !(responseAudio instanceof File)) {
				return jsonResponse(
					{
						error:
							'Expected multipart files "callAudio" and "responseAudio".',
					},
					400,
				)
			}

			if (callAudio.size <= 0 || responseAudio.size <= 0) {
				return jsonResponse({ error: 'Audio files must be non-empty.' }, 400)
			}
			if (callAudio.size > maxAudioBytes || responseAudio.size > maxAudioBytes) {
				return jsonResponse(
					{
						error: `Audio files must be <= ${maxAudioBytes} bytes each.`,
					},
					413,
				)
			}

			try {
				const stitched = await stitchAudio({
					callAudio: new Uint8Array(await callAudio.arrayBuffer()),
					responseAudio: new Uint8Array(await responseAudio.arrayBuffer()),
				})
				return jsonResponse({
					callerMp3Base64: Buffer.from(stitched.callerMp3).toString('base64'),
					responseMp3Base64: Buffer.from(stitched.responseMp3).toString(
						'base64',
					),
					episodeMp3Base64: Buffer.from(stitched.episodeMp3).toString('base64'),
				})
			} catch (error) {
				console.error('Failed to stitch episode audio', error)
				return jsonResponse({ error: 'Unable to stitch episode audio.' }, 500)
			}
		}

		return jsonResponse({ error: 'Not found' }, 404)
	}
}

export function createCallKentFfmpegServer({
	port = Number(process.env.CALL_KENT_FFMPEG_CONTAINER_PORT || 8080),
	stitchAudio = stitchEpisodeAudio,
} = {}) {
	const handler = createCallKentFfmpegHandler({ stitchAudio })
	const server = createServer(async (req, res) => {
		try {
			const request = toWebRequest(req)
			const response = await handler(request)
			await writeWebResponse(response, res)
		} catch (error) {
			console.error('Call Kent ffmpeg container request failed', error)
			res.statusCode = 500
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.end(JSON.stringify({ error: 'Internal server error' }))
		}
	})
	return {
		server,
		start() {
			server.listen(port, '0.0.0.0', () => {
				console.log(`Call Kent ffmpeg container listening on :${port}`)
			})
			return server
		},
	}
}

function toWebRequest(nodeRequest) {
	const host = nodeRequest.headers.host ?? 'localhost'
	const url = new URL(nodeRequest.url ?? '/', `http://${host}`)
	const bodyAllowed =
		nodeRequest.method !== 'GET' && nodeRequest.method !== 'HEAD'
	return new Request(url, {
		method: nodeRequest.method,
		headers: nodeRequest.headers,
		body: bodyAllowed ? nodeRequest : undefined,
		duplex: bodyAllowed ? 'half' : undefined,
	})
}

async function writeWebResponse(response, nodeResponse) {
	nodeResponse.statusCode = response.status
	nodeResponse.statusMessage = response.statusText
	response.headers.forEach((value, key) => {
		nodeResponse.setHeader(key, value)
	})

	if (!response.body) {
		nodeResponse.end()
		return
	}

	for await (const chunk of response.body) {
		nodeResponse.write(chunk)
	}
	nodeResponse.end()
}

function jsonResponse(payload, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}
