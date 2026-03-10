import { createHmac } from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { z } from 'zod'
import { resolveStitchAssets } from './resolve-stitch-assets.ts'

const envSchema = z.object({
	R2_ENDPOINT: z.string().trim().min(1),
	R2_ACCESS_KEY_ID: z.string().trim().min(1),
	R2_SECRET_ACCESS_KEY: z.string().trim().min(1),
	CALL_KENT_R2_BUCKET: z.string().trim().min(1),
	CALL_KENT_AUDIO_JOB_REQUEST_BODY: z.string().trim().min(1),
})

const jobSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
	callbackUrl: z.url(),
	callbackSecret: z.string().trim().min(1),
	attempt: z.number().int().positive().optional(),
})

const env = envSchema.parse(process.env)

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
	const callbackTimeoutMs = 10_000
	let response: Response
	try {
		response = await fetch(callbackUrl, {
			method: 'POST',
			signal: AbortSignal.timeout(callbackTimeoutMs),
			headers: {
				'Content-Type': 'application/json',
				'x-call-kent-audio-timestamp': timestamp,
				'x-call-kent-audio-signature': signature,
			},
			body,
		})
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === 'AbortError' || error.name === 'TimeoutError')
		) {
			throw new Error(`Callback timed out after ${callbackTimeoutMs}ms`)
		}
		throw error
	}
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Callback failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
}

async function processEpisodeAudioJob(job: z.infer<typeof jobSchema>) {
	const startedAt = Date.now()
	const jobContext = getJobLogContext(job)
	console.info('Call Kent audio sandbox job accepted', jobContext)
	try {
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
		console.info('Call Kent audio sandbox job completed', {
			...jobContext,
			elapsedMs: Date.now() - startedAt,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('Call Kent audio sandbox job failed', {
			...jobContext,
			elapsedMs: Date.now() - startedAt,
			error: message,
		})
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
		throw error
	}
}

function parseJobRequest(rawJobRequest: string) {
	let parsedJson: unknown
	try {
		parsedJson = JSON.parse(rawJobRequest)
	} catch {
		throw new Error('CALL_KENT_AUDIO_JOB_REQUEST_BODY must contain valid JSON')
	}
	return jobSchema.parse(parsedJson)
}

async function main() {
	const job = parseJobRequest(env.CALL_KENT_AUDIO_JOB_REQUEST_BODY)
	await processEpisodeAudioJob(job)
}

void main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error)
	console.error('Call Kent audio sandbox process crashed', { error: message })
	process.exitCode = 1
})
