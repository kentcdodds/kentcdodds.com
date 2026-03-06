import { createHmac, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { z } from 'zod'

const envSchema = z.object({
	PORT: z.string().trim().default('8788'),
	R2_ENDPOINT: z.string().trim().min(1),
	R2_ACCESS_KEY_ID: z.string().trim().min(1),
	R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
	CALL_KENT_R2_BUCKET: z.string().trim().min(1),
	CALL_KENT_AUDIO_CONTAINER_TOKEN: z.string().trim().min(1),
})

const jobSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
	callbackUrl: z.string().url(),
	callbackSecret: z.string().trim().min(1),
	attempt: z.number().int().positive().optional(),
})

const env = envSchema.parse(process.env)
const app = express()
app.use(express.json({ limit: '1mb' }))

const s3 = new S3Client({
	region: 'auto',
	endpoint: env.R2_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	},
})

async function streamToBuffer(stream: NodeJS.ReadableStream) {
	const chunks: Array<Buffer> = []
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
	}
	return Buffer.concat(chunks)
}

async function getAudio(key: string) {
	const res = await s3.send(
		new GetObjectCommand({
			Bucket: env.CALL_KENT_R2_BUCKET,
			Key: key,
		}),
	)
	if (!res.Body) throw new Error(`Missing body for key: ${key}`)
	return streamToBuffer(res.Body as NodeJS.ReadableStream)
}

async function putAudio({
	key,
	audio,
	contentType,
}: {
	key: string
	audio: Buffer
	contentType: string
}) {
	await s3.send(
		new PutObjectCommand({
			Bucket: env.CALL_KENT_R2_BUCKET,
			Key: key,
			Body: audio,
			ContentType: contentType,
		}),
	)
	return { key, contentType, size: audio.byteLength }
}

async function runFfmpeg({
	callAudio,
	responseAudio,
}: {
	callAudio: Buffer
	responseAudio: Buffer
}) {
	const workId = randomUUID()
	const workDir = path.join(os.tmpdir(), `call-kent-audio-${workId}`)
	await fs.mkdir(workDir, { recursive: true })
	const callPath = path.join(workDir, 'call.mp3')
	const responsePath = path.join(workDir, 'response.mp3')
	const callOutPath = path.join(workDir, 'call.normalized.mp3')
	const responseOutPath = path.join(workDir, 'response.normalized.mp3')
	const episodeOutPath = path.join(workDir, 'episode.mp3')
	await fs.writeFile(callPath, callAudio)
	await fs.writeFile(responsePath, responseAudio)
	const args = [
		'-i',
		callPath,
		'-i',
		responsePath,
		'-filter_complex',
		`
      [0]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[call0];
      [1]silenceremove=1:0:-50dB, silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB, loudnorm=I=-16:LRA=11:TP=0.0[response0];
      [call0]asplit=2[callForEpisode][callForStandalone];
      [response0]asplit=2[responseForEpisode][responseForStandalone];
      [callForEpisode][responseForEpisode]acrossfade=d=1:c1=nofade:c2=nofade[out]
    `,
		'-map',
		'[callForStandalone]',
		callOutPath,
		'-map',
		'[responseForStandalone]',
		responseOutPath,
		'-map',
		'[out]',
		episodeOutPath,
	]
	await new Promise<void>((resolve, reject) => {
		spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`ffmpeg exited with code ${String(code)}`))
		})
	})
	const [callerMp3, responseMp3, episodeMp3] = await Promise.all([
		fs.readFile(callOutPath),
		fs.readFile(responseOutPath),
		fs.readFile(episodeOutPath),
	])
	await fs.rm(workDir, { recursive: true, force: true })
	return { callerMp3, responseMp3, episodeMp3 }
}

function createSignature({
	secret,
	timestamp,
	body,
}: {
	secret: string
	timestamp: string
	body: string
}) {
	return createHmac('sha256', secret)
		.update(`${timestamp}.${body}`, 'utf8')
		.digest('hex')
}

async function sendCallback({
	callbackUrl,
	callbackSecret,
	event,
}: {
	callbackUrl: string
	callbackSecret: string
	event: unknown
}) {
	const body = JSON.stringify(event)
	const timestamp = Math.floor(Date.now() / 1000).toString()
	const signature = createSignature({
		secret: callbackSecret,
		timestamp,
		body,
	})
	const response = await fetch(callbackUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-call-kent-audio-timestamp': timestamp,
			'x-call-kent-audio-signature': signature,
		},
		body,
	})
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Callback failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
}

app.post('/jobs/episode-audio', async (req, res) => {
	try {
		const token = req.headers.authorization?.slice('Bearer '.length)
		if (token !== env.CALL_KENT_AUDIO_CONTAINER_TOKEN) {
			return res.status(401).send('Unauthorized')
		}
		const job = jobSchema.parse(req.body)
		await sendCallback({
			callbackUrl: job.callbackUrl,
			callbackSecret: job.callbackSecret,
			event: {
				type: 'audio_generation_started',
				draftId: job.draftId,
				attempt: job.attempt ?? 1,
			},
		})
		const [callAudio, responseAudio] = await Promise.all([
			getAudio(job.callAudioKey),
			getAudio(job.responseAudioKey),
		])
		const generated = await runFfmpeg({ callAudio, responseAudio })
		const [episode, callerSegment, responseSegment] = await Promise.all([
			putAudio({
				key: `call-kent/drafts/${job.draftId}/episode.mp3`,
				audio: generated.episodeMp3,
				contentType: 'audio/mpeg',
			}),
			putAudio({
				key: `call-kent/drafts/${job.draftId}/caller-segment.mp3`,
				audio: generated.callerMp3,
				contentType: 'audio/mpeg',
			}),
			putAudio({
				key: `call-kent/drafts/${job.draftId}/response-segment.mp3`,
				audio: generated.responseMp3,
				contentType: 'audio/mpeg',
			}),
		])
		await sendCallback({
			callbackUrl: job.callbackUrl,
			callbackSecret: job.callbackSecret,
			event: {
				type: 'audio_generation_completed',
				draftId: job.draftId,
				episodeAudioKey: episode.key,
				episodeAudioContentType: episode.contentType,
				episodeAudioSize: episode.size,
				callerSegmentAudioKey: callerSegment.key,
				responseSegmentAudioKey: responseSegment.key,
				attempt: job.attempt ?? 1,
			},
		})
		return res.status(200).json({ ok: true })
	} catch (error) {
		console.error(error)
		const message = error instanceof Error ? error.message : String(error)
		const body = req.body
		if (
			typeof body?.callbackUrl === 'string' &&
			typeof body?.callbackSecret === 'string' &&
			typeof body?.draftId === 'string'
		) {
			await sendCallback({
				callbackUrl: body.callbackUrl,
				callbackSecret: body.callbackSecret,
				event: {
					type: 'audio_generation_failed',
					draftId: body.draftId,
					errorMessage: message,
					attempt: typeof body.attempt === 'number' ? body.attempt : 1,
				},
			}).catch(() => {})
		}
		return res.status(500).send(message)
	}
})

app.listen(Number(env.PORT), () => {
	console.info(`call-kent-audio-container listening on port ${env.PORT}`)
})
