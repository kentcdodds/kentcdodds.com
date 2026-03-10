import { createHmac, timingSafeEqual } from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { serve } from '@hono/node-server'
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { Hono } from 'hono'
import { z } from 'zod'
import { resolveStitchAssets } from './resolve-stitch-assets.ts'

const envSchema = z.object({
	PORT: z.string().trim().default('8788'),
	R2_ENDPOINT: z.string().trim().min(1),
	R2_ACCESS_KEY_ID: z.string().trim().min(1),
	R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
	CALL_KENT_R2_BUCKET: z.string().trim().min(1),
	CALL_KENT_AUDIO_CONTAINER_TOKEN: z.string().trim().min(1),
	CALL_KENT_AUDIO_CONTAINER_HEARTBEAT_URL: z.url(),
	CALL_KENT_AUDIO_CONTAINER_SHUTDOWN_URL: z.url(),
})

const jobSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
	callbackUrl: z.url().optional(),
	callbackSecret: z.string().trim().min(1).optional(),
	attempt: z.number().int().positive().optional(),
})

const syncJobSchema = jobSchema.pick({
	draftId: true,
	callAudioKey: true,
	responseAudioKey: true,
})

const env = envSchema.parse(process.env)
const app = new Hono()
const activeDraftJobs = new Set<string>()
const jobHeartbeatIntervalMs = 30_000

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

function getJobLogContext(job: z.infer<typeof jobSchema>) {
	return {
		draftId: job.draftId,
		attempt: job.attempt ?? 1,
		callAudioKey: job.callAudioKey,
		responseAudioKey: job.responseAudioKey,
	}
}

function hasCallbackConfig(job: z.infer<typeof jobSchema>): job is z.infer<
	typeof jobSchema
> & {
	callbackUrl: string
	callbackSecret: string
} {
	return Boolean(job.callbackUrl && job.callbackSecret)
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

const episodeDraftAudioFileNameByKind = {
	episode: 'episode.mp3',
	callerSegment: 'caller-segment.mp3',
	responseSegment: 'response-segment.mp3',
} as const

function getEpisodeDraftAudioKey({
	draftId,
	kind,
}: {
	draftId: string
	kind: keyof typeof episodeDraftAudioFileNameByKind
}) {
	// Keep these paths in sync with app/utils/call-kent-audio-storage.server.ts.
	return `call-kent/drafts/${draftId}/${episodeDraftAudioFileNameByKind[kind]}`
}

async function createTempDirForAudioWork(tempPrefixPath: string) {
	const dirPath = await fs.mkdtemp(tempPrefixPath)
	return {
		path: dirPath,
		async [Symbol.asyncDispose]() {
			await fs.rm(dirPath, { recursive: true, force: true })
		},
	}
}

async function runFfmpeg({
	callAudio,
	responseAudio,
}: {
	callAudio: Buffer
	responseAudio: Buffer
}) {
	await using workDir = await createTempDirForAudioWork(
		path.join(os.tmpdir(), 'call-kent-audio-'),
	)
	const callPath = path.join(workDir.path, 'call.mp3')
	const responsePath = path.join(workDir.path, 'response.mp3')
	const callOutPath = path.join(workDir.path, 'call.normalized.mp3')
	const responseOutPath = path.join(workDir.path, 'response.normalized.mp3')
	const episodeOutPath = path.join(workDir.path, 'episode.mp3')
	await fs.writeFile(callPath, callAudio)
	await fs.writeFile(responsePath, responseAudio)
	const stitchAssets = resolveStitchAssets()
	// prettier-ignore
	const args = [
		'-hide_banner',
		'-nostats',
		'-loglevel', 'error',
		'-i', stitchAssets.introPath,
		'-i', callPath,
		'-i', stitchAssets.interstitialPath,
		'-i', responsePath,
		'-i', stitchAssets.outroPath,
		'-filter_complex', `
			[1]silenceremove=1:0:-50dB[trimmedCall];
			[3]silenceremove=1:0:-50dB[trimmedResponse];
			[trimmedCall]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceCall];
			[trimmedResponse]silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB[noSilenceResponse];
			[noSilenceCall]loudnorm=I=-16:LRA=11:TP=0.0[call0];
			[noSilenceResponse]loudnorm=I=-16:LRA=11:TP=0.0[response0];
			[call0]asplit=2[callForEpisode][callForStandalone];
			[response0]asplit=2[responseForEpisode][responseForStandalone];
			[0][callForEpisode]acrossfade=d=1:c2=nofade[a01];
			[a01][2]acrossfade=d=1:c1=nofade[a02];
			[a02][responseForEpisode]acrossfade=d=1:c2=nofade[a03];
			[a03][4]acrossfade=d=1:c1=nofade[out]
		`,
		'-map', '[callForStandalone]', callOutPath,
		'-map', '[responseForStandalone]', responseOutPath,
		'-map', '[out]', episodeOutPath,
	]
	await new Promise<void>((resolve, reject) => {
		const child = spawn('ffmpeg', args, { stdio: 'inherit' })
		child.once('error', reject)
		child.once('close', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`ffmpeg exited with code ${String(code)}`))
		})
	})
	const [callerMp3, responseMp3, episodeMp3] = await Promise.all([
		fs.readFile(callOutPath),
		fs.readFile(responseOutPath),
		fs.readFile(episodeOutPath),
	])
	return { callerMp3, responseMp3, episodeMp3 }
}

type EpisodeAudioJobOutput = {
	episode: Awaited<ReturnType<typeof putAudio>>
	callerSegment: Awaited<ReturnType<typeof putAudio>>
	responseSegment: Awaited<ReturnType<typeof putAudio>>
}

async function generateEpisodeAudioAssets(job: z.infer<typeof jobSchema>) {
	const jobContext = getJobLogContext(job)
	console.info('Call Kent audio job input fetch starting', jobContext)
	const [callAudio, responseAudio] = await Promise.all([
		getAudio(job.callAudioKey),
		getAudio(job.responseAudioKey),
	])
	console.info('Call Kent audio job input fetch completed', {
		...jobContext,
		callAudioBytes: callAudio.byteLength,
		responseAudioBytes: responseAudio.byteLength,
	})

	console.info('Call Kent audio job ffmpeg starting', jobContext)
	const ffmpegStartedAt = Date.now()
	const generated = await runFfmpeg({ callAudio, responseAudio })
	console.info('Call Kent audio job ffmpeg completed', {
		...jobContext,
		elapsedMs: Date.now() - ffmpegStartedAt,
		episodeAudioBytes: generated.episodeMp3.byteLength,
		callerSegmentBytes: generated.callerMp3.byteLength,
		responseSegmentBytes: generated.responseMp3.byteLength,
	})

	console.info('Call Kent audio job upload starting', jobContext)
	const [episode, callerSegment, responseSegment] = await Promise.all([
		putAudio({
			key: getEpisodeDraftAudioKey({ draftId: job.draftId, kind: 'episode' }),
			audio: generated.episodeMp3,
			contentType: 'audio/mpeg',
		}),
		putAudio({
			key: getEpisodeDraftAudioKey({
				draftId: job.draftId,
				kind: 'callerSegment',
			}),
			audio: generated.callerMp3,
			contentType: 'audio/mpeg',
		}),
		putAudio({
			key: getEpisodeDraftAudioKey({
				draftId: job.draftId,
				kind: 'responseSegment',
			}),
			audio: generated.responseMp3,
			contentType: 'audio/mpeg',
		}),
	])
	console.info('Call Kent audio job upload completed', {
		...jobContext,
		episodeAudioKey: episode.key,
		callerSegmentAudioKey: callerSegment.key,
		responseSegmentAudioKey: responseSegment.key,
	})
	return { episode, callerSegment, responseSegment }
}

async function processEpisodeAudioJob(
	job: z.infer<typeof jobSchema>,
): Promise<EpisodeAudioJobOutput | null> {
	const startedAt = Date.now()
	const jobContext = getJobLogContext(job)
	const stopJobHeartbeat = startJobHeartbeat(jobContext)

	console.info('Call Kent audio job accepted', jobContext)
	try {
		if (hasCallbackConfig(job)) {
			console.info('Call Kent audio job callback starting', {
				...jobContext,
				eventType: 'audio_generation_started',
			})
			await sendCallback({
				callbackUrl: job.callbackUrl,
				callbackSecret: job.callbackSecret,
				event: {
					type: 'audio_generation_started',
					draftId: job.draftId,
					attempt: job.attempt ?? 1,
				},
			})
			console.info('Call Kent audio job callback completed', {
				...jobContext,
				eventType: 'audio_generation_started',
			})
		}

		const result = await generateEpisodeAudioAssets(job)

		if (hasCallbackConfig(job)) {
			console.info('Call Kent audio job callback starting', {
				...jobContext,
				eventType: 'audio_generation_completed',
			})
			await sendCallback({
				callbackUrl: job.callbackUrl,
				callbackSecret: job.callbackSecret,
				event: {
					type: 'audio_generation_completed',
					draftId: job.draftId,
					episodeAudioKey: result.episode.key,
					episodeAudioContentType: result.episode.contentType,
					episodeAudioSize: result.episode.size,
					callerSegmentAudioKey: result.callerSegment.key,
					responseSegmentAudioKey: result.responseSegment.key,
					attempt: job.attempt ?? 1,
				},
			})
			console.info('Call Kent audio job callback completed', {
				...jobContext,
				eventType: 'audio_generation_completed',
				elapsedMs: Date.now() - startedAt,
			})
		}

		return result
	} catch (error) {
		console.error('Call Kent audio job failed', {
			...jobContext,
			error: error instanceof Error ? error.message : String(error),
			elapsedMs: Date.now() - startedAt,
		})
		const message = error instanceof Error ? error.message : String(error)
		if (hasCallbackConfig(job)) {
			await sendCallback({
				callbackUrl: job.callbackUrl,
				callbackSecret: job.callbackSecret,
				event: {
					type: 'audio_generation_failed',
					draftId: job.draftId,
					errorMessage: message,
					attempt: job.attempt ?? 1,
				},
			}).catch((callbackError: unknown) => {
				console.error('Failed to send audio generation failed callback', {
					...jobContext,
					callbackUrl: job.callbackUrl,
					eventType: 'audio_generation_failed',
					error:
						callbackError instanceof Error
							? callbackError.message
							: String(callbackError),
				})
			})
			return null
		}
		throw error
	} finally {
		stopJobHeartbeat()
		activeDraftJobs.delete(job.draftId)
		const activeJobs = activeDraftJobs.size
		console.info('Call Kent audio job released', {
			...jobContext,
			activeJobs,
		})
		if (activeJobs === 0) {
			await requestShutdownIfIdle().catch((shutdownError: unknown) => {
				console.error('Failed to request audio container shutdown', {
					...jobContext,
					error:
						shutdownError instanceof Error
							? shutdownError.message
							: String(shutdownError),
				})
			})
		}
	}
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

function timingSafeEqualString(left: string, right: string) {
	const leftBuffer = Buffer.from(left)
	const rightBuffer = Buffer.from(right)
	if (leftBuffer.length !== rightBuffer.length) {
		return false
	}
	return timingSafeEqual(leftBuffer, rightBuffer)
}

function getBearerToken(authorizationHeader: string | undefined) {
	return authorizationHeader?.slice('Bearer '.length) ?? ''
}

function isAuthorized(authorizationHeader: string | undefined) {
	return timingSafeEqualString(
		getBearerToken(authorizationHeader),
		env.CALL_KENT_AUDIO_CONTAINER_TOKEN,
	)
}

async function postToControlUrl(url: string) {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.CALL_KENT_AUDIO_CONTAINER_TOKEN}`,
		},
	})
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Control request failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
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

async function requestHeartbeat() {
	await postToControlUrl(env.CALL_KENT_AUDIO_CONTAINER_HEARTBEAT_URL)
}

async function requestShutdownIfIdle() {
	await postToControlUrl(env.CALL_KENT_AUDIO_CONTAINER_SHUTDOWN_URL)
}

function startJobHeartbeat(jobContext: ReturnType<typeof getJobLogContext>) {
	const interval = setInterval(() => {
		void requestHeartbeat().catch((heartbeatError: unknown) => {
			console.error('Failed to renew audio container activity', {
				...jobContext,
				error:
					heartbeatError instanceof Error
						? heartbeatError.message
						: String(heartbeatError),
			})
		})
	}, jobHeartbeatIntervalMs)
	interval.unref?.()
	return function stopJobHeartbeat() {
		clearInterval(interval)
	}
}

app.get('/internal/status', (c) => {
	if (!isAuthorized(c.req.header('authorization'))) {
		return c.text('Unauthorized', 401)
	}
	return c.json({ activeJobs: activeDraftJobs.size })
})

app.post('/jobs/episode-audio', async (c) => {
	try {
		if (!isAuthorized(c.req.header('authorization'))) {
			return c.text('Unauthorized', 401)
		}
		const requestBody = await c.req.json()
		const job = jobSchema.parse(requestBody)
		if (!hasCallbackConfig(job)) {
			return c.text('callbackUrl and callbackSecret are required.', 400)
		}
		if (activeDraftJobs.has(job.draftId)) {
			console.info('Call Kent audio job already running', {
				...getJobLogContext(job),
				activeJobs: activeDraftJobs.size,
			})
			return c.json({ ok: true, status: 'already-running' }, 202)
		}

		activeDraftJobs.add(job.draftId)
		void processEpisodeAudioJob(job)
		return c.json({ ok: true, status: 'accepted' }, 202)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('Call Kent audio job request rejected', { error: message })
		return c.text(message, 500)
	}
})

app.post('/jobs/episode-audio-sync', async (c) => {
	try {
		if (!isAuthorized(c.req.header('authorization'))) {
			return c.text('Unauthorized', 401)
		}
		const requestBody = await c.req.json()
		const job = syncJobSchema.parse(requestBody)
		if (activeDraftJobs.has(job.draftId)) {
			console.info('Call Kent audio sync job already running', {
				...getJobLogContext(job),
				activeJobs: activeDraftJobs.size,
			})
			return c.text('Job already running for draftId', 409)
		}
		activeDraftJobs.add(job.draftId)
		const result = await processEpisodeAudioJob(job)
		if (!result) {
			throw new Error('Synchronous job unexpectedly returned no result.')
		}
		return c.json(
			{
				ok: true,
				status: 'completed',
				result: {
					episodeAudioKey: result.episode.key,
					episodeAudioContentType: result.episode.contentType,
					episodeAudioSize: result.episode.size,
					callerSegmentAudioKey: result.callerSegment.key,
					responseSegmentAudioKey: result.responseSegment.key,
				},
			},
			200,
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('Call Kent audio sync job request rejected', {
			error: message,
		})
		return c.text(message, 500)
	}
})

serve({ fetch: app.fetch, port: Number(env.PORT) }, () => {
	console.info(`call-kent-audio-container listening on port ${env.PORT}`)
})
