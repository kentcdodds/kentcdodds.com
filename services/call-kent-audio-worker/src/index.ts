import { z } from 'zod'
import { type Env } from './env'

type WorkflowEvent<T> = {
	payload: Readonly<T>
	timestamp: Date
	instanceId: string
}

type WorkflowStepConfig = {
	retries?: { limit: number; delay: string | number; backoff?: string }
	timeout?: string | number
}

type WorkflowStep = {
	do<T>(name: string, callback: () => Promise<T>): Promise<T>
	do<T>(
		name: string,
		config: WorkflowStepConfig,
		callback: () => Promise<T>,
	): Promise<T>
}

type ExecutionContext = {
	waitUntil: (promise: Promise<unknown>) => void
}

declare abstract class WorkflowEntrypoint<WorkflowEnv, TPayload> {
	protected env: WorkflowEnv
	constructor(ctx: ExecutionContext, env: WorkflowEnv)
	abstract run(
		event: Readonly<WorkflowEvent<TPayload>>,
		step: WorkflowStep,
	): Promise<unknown>
}

const workflowParamsSchema = z.object({
	draftId: z.string().trim().min(1),
	callAudioKey: z.string().trim().min(1),
	responseAudioKey: z.string().trim().min(1),
	cloudflareAccountId: z.string().trim().min(1),
	callTitle: z.string().trim().min(1),
	callerNotes: z.string().trim().optional().nullable(),
	callerName: z.string().trim().optional().nullable(),
	savedCallerTranscript: z.string().trim().optional().nullable(),
})

const episodeAudioGenerationResultSchema = z.object({
	episodeAudioKey: z.string().trim().min(1),
	episodeAudioContentType: z.string().trim().min(1),
	episodeAudioSize: z.number().int().positive(),
	callerSegmentAudioKey: z.string().trim().min(1),
	responseSegmentAudioKey: z.string().trim().min(1),
})

const callKentIntroTranscript = `
You're listening to the Call Kent Podcast where Kent C. Dodds answers questions and gives insights to software engineers like you.

Now let's hear the call.
`.trim()

const callKentInterludeTranscript = `
That was the call.

Here's what Kent had to say.
`.trim()

const callKentOutroTranscript = `
This has been the Call Kent Podcast.

Learn more about Kent at kentcdodds.com and get your own questions answered at kentcdodds.com/calls.
`.trim()

function getWorkersAiRunUrl({
	model,
	accountId,
	env,
}: {
	model: string
	accountId: string
	env: Env
}) {
	return `https://gateway.ai.cloudflare.com/v1/${accountId}/${env.CLOUDFLARE_AI_GATEWAY_ID}/workers-ai/${model}`
}

function unwrapWorkersAiText(result: unknown): string | null {
	if (!result) return null
	if (typeof result === 'string') return result
	if (typeof result !== 'object') return null
	const record = result as Record<string, unknown>
	const nested = record.result
	if (nested && nested !== result) {
		const unwrapped = unwrapWorkersAiText(nested)
		if (unwrapped) return unwrapped
	}
	if (typeof record.response === 'string') return record.response
	if (typeof record.output === 'string') return record.output
	if (typeof record.text === 'string') return record.text
	const firstChoice = Array.isArray(record.choices) ? record.choices[0] : null
	if (firstChoice && typeof firstChoice === 'object') {
		const choiceRecord = firstChoice as Record<string, unknown>
		const message =
			choiceRecord.message && typeof choiceRecord.message === 'object'
				? (choiceRecord.message as Record<string, unknown>)
				: null
		if (message && typeof message.content === 'string') {
			return message.content
		}
	}
	return null
}

function assembleCallKentTranscript({
	callerTranscript,
	kentTranscript,
	callerName,
}: {
	callerTranscript: string
	kentTranscript: string
	callerName?: string
}) {
	return `
Announcer: ${callKentIntroTranscript}

---

${callerName ?? 'Caller'}: ${callerTranscript.trim()}

---

Announcer: ${callKentInterludeTranscript}

---

Kent: ${kentTranscript.trim()}

---

Announcer: ${callKentOutroTranscript}
`.trim()
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeCallerTranscriptForEpisode({
	callerTranscript,
	callerName,
}: {
	callerTranscript?: string | null
	callerName?: string
}) {
	const trimmed = callerTranscript?.trim()
	if (!trimmed) return null
	const labels = [callerName?.trim(), 'Caller'].filter(
		(label): label is string => Boolean(label),
	)
	for (const label of labels) {
		const labelRegex = new RegExp(`^${escapeRegExp(label)}:\\s*`, 'i')
		if (labelRegex.test(trimmed)) {
			return trimmed.replace(labelRegex, '').trim()
		}
	}
	return trimmed
}

function normalizeForComparison(text: string) {
	return text.trim().replace(/\s+/g, ' ')
}

function countWords(text: string) {
	const normalized = normalizeForComparison(text)
	if (!normalized) return 0
	return normalized.split(' ').length
}

function clampNumber(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

function estimateMaxTokensForTranscriptFormatting(transcript: string) {
	const normalized = normalizeForComparison(transcript)
	const approxTokens = Math.ceil(normalized.length / 4)
	return clampNumber(Math.ceil(approxTokens * 1.2) + 128, 512, 8192)
}

function stripSingleMarkdownCodeFence(text: string) {
	const trimmed = text.trim()
	const match = /^```(?:text|markdown)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed)
	return match?.[1] ? match[1].trim() : text
}

function extractBetweenMarkers({
	text,
	startMarker,
	endMarker,
}: {
	text: string
	startMarker: string
	endMarker: string
}) {
	const start = text.indexOf(startMarker)
	if (start === -1) return null
	const end = text.indexOf(endMarker, start + startMarker.length)
	if (end === -1) return null
	return text.slice(start + startMarker.length, end).trim()
}

function countSeparatorLines(text: string) {
	return (text.match(/^---$/gm) ?? []).length
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = ''
	const chunkSize = 0x8000
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize)
		binary += String.fromCharCode(...chunk)
	}
	return btoa(binary)
}

async function createSignature({
	secret,
	timestamp,
	body,
}: {
	secret: string
	timestamp: string
	body: string
}) {
	const encoder = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const signatureBuffer = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(`${timestamp}.${body}`),
	)
	return Array.from(new Uint8Array(signatureBuffer))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

async function sendCallback({ env, event }: { env: Env; event: unknown }) {
	const body = JSON.stringify(event)
	const timestamp = Math.floor(Date.now() / 1000).toString()
	const signature = await createSignature({
		secret: env.CALL_KENT_AUDIO_CALLBACK_SECRET,
		timestamp,
		body,
	})
	const response = await fetch(env.CALL_KENT_AUDIO_CALLBACK_URL, {
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

async function fetchAudioFromR2({ env, key }: { env: Env; key: string }) {
	const object = await env.CALL_KENT_AUDIO_BUCKET.get(key)
	if (!object) {
		throw new Error(`Audio object not found in R2: ${key}`)
	}
	return new Uint8Array(await object.arrayBuffer())
}

async function transcribeMp3WithWorkersAi({
	env,
	cloudflareAccountId,
	mp3,
	callerName,
	callTitle,
	callerNotes,
}: {
	env: Env
	cloudflareAccountId: string
	mp3: Uint8Array
	callerName?: string
	callTitle?: string
	callerNotes?: string
}) {
	const model = env.CLOUDFLARE_AI_TRANSCRIPTION_MODEL
	const isWhisperLargeV3Turbo = model.includes('whisper-large-v3-turbo')
	const body: string | BodyInit = isWhisperLargeV3Turbo
		? JSON.stringify({
				audio: bytesToBase64(mp3),
				language: 'en',
				vad_filter: true,
				initial_prompt: `
This is the Call Kent Podcast hosted by Kent C. Dodds. It starts with an intro from an "announcer" and then leads into the caller's call which is a question or discussion topic. Then there is a short interlude from the announcer. Then Kent gives his response. Then there is an outro from the announcer.
Canonical website domain: kentcdodds.com
Canonical calls page: kentcdodds.com/calls
${callTitle?.trim() ? `Episode title: ${callTitle.trim()}` : ''}
${callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}` : ''}
Proper nouns:
- Kent C. Dodds
${callerName ? `- ${callerName}` : ''}
`.trim(),
			})
		: (mp3 as BodyInit)
	const response = await fetch(
		getWorkersAiRunUrl({ model, accountId: cloudflareAccountId, env }),
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
				'Content-Type': isWhisperLargeV3Turbo
					? 'application/json'
					: 'audio/mpeg',
			},
			body,
		},
	)
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI transcription failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
	const json = (await response.json()) as {
		result?: { text?: string }
		text?: string
	}
	const result = json.result ?? json
	if (!result?.text || typeof result.text !== 'string') {
		throw new Error('Unexpected transcription response shape from Workers AI')
	}
	return result.text.trim()
}

async function formatCallKentTranscriptWithWorkersAi({
	env,
	cloudflareAccountId,
	transcript,
	callTitle,
	callerNotes,
	callerName,
}: {
	env: Env
	cloudflareAccountId: string
	transcript: string
	callTitle?: string | null
	callerNotes?: string | null
	callerName?: string | null
}) {
	const input = transcript.trim()
	if (!input) throw new Error('Missing transcript input for formatting.')
	const startMarker = '<<<TRANSCRIPT>>>'
	const endMarker = '<<<END TRANSCRIPT>>>'
	const maxTokensToUse = estimateMaxTokensForTranscriptFormatting(input)
	const system = `
You format transcripts for the "Call Kent Podcast", hosted by Kent C. Dodds.
Your job is to improve readability by inserting paragraph breaks (blank lines) and normalizing whitespace.
Do NOT add, remove, or reorder any words. Do NOT change speaker labels.
Keep speaker turns in the same order and never merge one speaker's turn into another.
If the transcript includes separator lines containing only "---", keep those lines exactly as-is and on their own line.
Output only the final formatted transcript as plain text.
`.trim()
	const contextLines = [
		callTitle?.trim() ? `Episode title: ${callTitle.trim()}` : null,
		callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}` : null,
		callerName?.trim() ? `Caller first name: ${callerName.trim()}` : null,
	].filter(Boolean)
	const user = `
${contextLines.length ? `${contextLines.join('\n')}\n\n` : ''}Format this transcript into readable paragraphs.

${startMarker}
${input}
${endMarker}
`.trim()
	const response = await fetch(
		getWorkersAiRunUrl({
			model: env.CLOUDFLARE_AI_CALL_KENT_TRANSCRIPT_FORMAT_MODEL,
			accountId: cloudflareAccountId,
			env,
		}),
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				max_tokens: maxTokensToUse,
			}),
		},
	)
	if (!response.ok) {
		const bodyText = await response.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI transcript formatting failed: ${response.status} ${response.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}
	const json = (await response.json()) as { result?: unknown }
	const text = unwrapWorkersAiText(json.result ?? json)
	if (!text) {
		throw new Error(
			'Unexpected transcript formatting response shape from Workers AI',
		)
	}
	let formatted = stripSingleMarkdownCodeFence(text).trim()
	const extracted = extractBetweenMarkers({
		text: formatted,
		startMarker,
		endMarker,
	})
	if (extracted) formatted = extracted
	if (!formatted)
		throw new Error('Transcript formatter returned an empty transcript.')
	const originalSepCount = countSeparatorLines(input)
	if (originalSepCount > 0) {
		const formattedSepCount = countSeparatorLines(formatted)
		if (formattedSepCount !== originalSepCount) {
			throw new Error(
				`Transcript formatter changed separator count (${originalSepCount} -> ${formattedSepCount}).`,
			)
		}
	}
	const inputNormalized = normalizeForComparison(input)
	const formattedNormalized = normalizeForComparison(formatted)
	if (inputNormalized.length >= 1000) {
		const lengthRatio = formattedNormalized.length / inputNormalized.length
		const wordRatio =
			countWords(formattedNormalized) / countWords(inputNormalized)
		if (lengthRatio < 0.95 || wordRatio < 0.95) {
			throw new Error(
				`Transcript formatter output appears truncated (lengthRatio=${lengthRatio.toFixed(
					2,
				)}, wordRatio=${wordRatio.toFixed(2)}).`,
			)
		}
	}
	return formatted
}

function extractJsonObjectFromText(text: string) {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start < 0 || end <= start) {
		throw new Error('Workers AI did not return JSON metadata')
	}
	return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
}

function normalizeKeywords(value: unknown): string {
	if (typeof value === 'string') return value.trim()
	if (!Array.isArray(value)) return ''
	return value
		.filter((v): v is string => typeof v === 'string')
		.map((v) => v.trim())
		.filter(Boolean)
		.join(', ')
}

function clampTitle(title: string) {
	const cleaned = title.trim().replace(/\s+/g, ' ')
	return cleaned.length > 80 ? `${cleaned.slice(0, 77).trimEnd()}...` : cleaned
}

async function generateCallKentEpisodeMetadataWithWorkersAi({
	env,
	cloudflareAccountId,
	transcript,
	callerTranscript,
	responderTranscript,
	callTitle,
	callerNotes,
}: {
	env: Env
	cloudflareAccountId: string
	transcript?: string
	callerTranscript?: string | null
	responderTranscript?: string | null
	callTitle?: string | null
	callerNotes?: string | null
}) {
	const system = `
You write metadata for the "Call Kent Podcast", hosted by Kent C. Dodds.
Only use information that is explicitly present in the provided transcripts and/or caller notes.
Do NOT invent details.
Output ONLY valid JSON with keys: title, description, keywords.
`.trim()
	const hasSegmentTranscripts = Boolean(
		callerTranscript?.trim() && responderTranscript?.trim(),
	)
	const transcriptBlock = hasSegmentTranscripts
		? `
# Transcripts:
## Caller transcript:
${callerTranscript!.trim()}
## Responder transcript (Kent's answer):
${responderTranscript!.trim()}
`.trim()
		: transcript?.trim()
			? `
# Transcript:
${transcript.trim()}
`.trim()
			: ''
	if (!transcriptBlock) {
		throw new Error('Missing transcript input for metadata generation.')
	}
	const user = `
${callTitle ? `Caller-provided title: ${callTitle}\n\n` : ''}${callerNotes?.trim() ? `Caller notes: ${callerNotes.trim()}\n\n` : ''}${transcriptBlock}
`.trim()
	const response = await fetch(
		getWorkersAiRunUrl({
			model: env.CLOUDFLARE_AI_CALL_KENT_METADATA_MODEL,
			accountId: cloudflareAccountId,
			env,
		}),
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'cf-aig-authorization': `Bearer ${env.CLOUDFLARE_AI_GATEWAY_AUTH_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				max_tokens: 800,
			}),
		},
	)
	if (!response.ok) {
		const bodyText = await response.text().catch(() => '')
		throw new Error(
			`Cloudflare Workers AI metadata generation failed: ${response.status} ${response.statusText}${bodyText ? `\n${bodyText}` : ''}`,
		)
	}
	const json = (await response.json()) as { result?: unknown }
	const text = unwrapWorkersAiText(json.result ?? json)
	if (!text) {
		throw new Error('Unexpected metadata response shape from Workers AI')
	}
	const parsed = extractJsonObjectFromText(text)
	const title = clampTitle(typeof parsed.title === 'string' ? parsed.title : '')
	const description =
		typeof parsed.description === 'string' ? parsed.description.trim() : ''
	const keywords = normalizeKeywords(parsed.keywords)
	if (!title || !description || !keywords) {
		throw new Error(
			'Workers AI metadata JSON missing one or more fields: title, description, keywords.',
		)
	}
	return { title, description, keywords }
}

async function requestEpisodeAudioGeneration({
	env,
	params,
}: {
	env: Env
	params: z.infer<typeof workflowParamsSchema>
}) {
	const response = await fetch(
		`${env.CALL_KENT_AUDIO_CONTAINER_URL}/jobs/episode-audio-sync`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.CALL_KENT_AUDIO_CONTAINER_TOKEN}`,
			},
			body: JSON.stringify({
				draftId: params.draftId,
				callAudioKey: params.callAudioKey,
				responseAudioKey: params.responseAudioKey,
			}),
		},
	)
	if (!response.ok) {
		const text = await response.text().catch(() => '')
		throw new Error(
			`Container request failed: ${response.status} ${response.statusText}${text ? `\n${text}` : ''}`,
		)
	}
	const payload = (await response.json()) as unknown
	const parsedPayload =
		typeof payload === 'object' && payload !== null
			? (payload as Record<string, unknown>)
			: null
	const result = parsedPayload?.result ?? payload
	return episodeAudioGenerationResultSchema.parse(result)
}

async function generateTranscript({
	env,
	params,
	audioResult,
}: {
	env: Env
	params: z.infer<typeof workflowParamsSchema>
	audioResult: z.infer<typeof episodeAudioGenerationResultSchema>
}) {
	const callerName = params.callerName?.trim() || undefined
	const savedCallerTranscript = normalizeCallerTranscriptForEpisode({
		callerTranscript: params.savedCallerTranscript,
		callerName,
	})
	const [callerSegment, responseSegment] = await Promise.all([
		fetchAudioFromR2({ env, key: audioResult.callerSegmentAudioKey }),
		fetchAudioFromR2({ env, key: audioResult.responseSegmentAudioKey }),
	])
	const [callerTranscript, kentTranscript] = await Promise.all([
		savedCallerTranscript
			? Promise.resolve(savedCallerTranscript)
			: transcribeMp3WithWorkersAi({
					env,
					cloudflareAccountId: params.cloudflareAccountId,
					mp3: callerSegment,
					callerName,
					callTitle: params.callTitle,
					callerNotes: params.callerNotes ?? undefined,
				}),
		transcribeMp3WithWorkersAi({
			env,
			cloudflareAccountId: params.cloudflareAccountId,
			mp3: responseSegment,
			callerName,
			callTitle: params.callTitle,
			callerNotes: params.callerNotes ?? undefined,
		}),
	])
	const rawTranscript = assembleCallKentTranscript({
		callerName,
		callerTranscript,
		kentTranscript,
	})
	const formattedTranscript = await formatCallKentTranscriptWithWorkersAi({
		env,
		transcript: rawTranscript,
		callTitle: params.callTitle,
		callerNotes: params.callerNotes,
		callerName: params.callerName,
		cloudflareAccountId: params.cloudflareAccountId,
	})
	return {
		formattedTranscript,
		callerTranscript,
		responderTranscript: kentTranscript,
	}
}

export class CallKentAudioPipelineWorkflow extends WorkflowEntrypoint<
	Env,
	z.infer<typeof workflowParamsSchema>
> {
	async run(
		event: Readonly<WorkflowEvent<z.infer<typeof workflowParamsSchema>>>,
		step: WorkflowStep,
	) {
		const params = workflowParamsSchema.parse(event.payload)
		const attempt = 1
		try {
			await step.do('notify-audio-generation-started', async () => {
				await sendCallback({
					env: this.env,
					event: {
						type: 'audio_generation_started',
						draftId: params.draftId,
						attempt,
					},
				})
				return { ok: true }
			})
			const audioResult = await step.do(
				'generate-episode-audio',
				{
					retries: { limit: 4, delay: '15 seconds', backoff: 'exponential' },
					timeout: '20 minutes',
				},
				async () => requestEpisodeAudioGeneration({ env: this.env, params }),
			)
			await step.do('notify-audio-generation-completed', async () => {
				await sendCallback({
					env: this.env,
					event: {
						type: 'audio_generation_completed',
						draftId: params.draftId,
						episodeAudioKey: audioResult.episodeAudioKey,
						episodeAudioContentType: audioResult.episodeAudioContentType,
						episodeAudioSize: audioResult.episodeAudioSize,
						callerSegmentAudioKey: audioResult.callerSegmentAudioKey,
						responseSegmentAudioKey: audioResult.responseSegmentAudioKey,
						attempt,
					},
				})
				return { ok: true }
			})
			const transcriptResult = await step.do(
				'generate-transcript',
				{
					retries: { limit: 2, delay: '10 seconds', backoff: 'linear' },
					timeout: '20 minutes',
				},
				async () =>
					generateTranscript({
						env: this.env,
						params,
						audioResult,
					}),
			)
			await step.do('notify-transcript-generation-completed', async () => {
				await sendCallback({
					env: this.env,
					event: {
						type: 'transcript_generation_completed',
						draftId: params.draftId,
						transcript: transcriptResult.formattedTranscript,
						attempt,
					},
				})
				return { ok: true }
			})
			const metadata = await step.do(
				'generate-metadata',
				{
					retries: { limit: 2, delay: '10 seconds', backoff: 'linear' },
					timeout: '10 minutes',
				},
				async () =>
					generateCallKentEpisodeMetadataWithWorkersAi({
						env: this.env,
						cloudflareAccountId: params.cloudflareAccountId,
						callerTranscript: transcriptResult.callerTranscript,
						responderTranscript: transcriptResult.responderTranscript,
						callTitle: params.callTitle,
						callerNotes: params.callerNotes,
					}),
			)
			await step.do('notify-metadata-generation-completed', async () => {
				await sendCallback({
					env: this.env,
					event: {
						type: 'metadata_generation_completed',
						draftId: params.draftId,
						title: metadata.title,
						description: metadata.description,
						keywords: metadata.keywords,
						attempt,
					},
				})
				return { ok: true }
			})
			return {
				ok: true,
				draftId: params.draftId,
			}
		} catch (error: unknown) {
			const message = getErrorMessage(error)
			await step
				.do('notify-draft-processing-failed', async () => {
					await sendCallback({
						env: this.env,
						event: {
							type: 'draft_processing_failed',
							draftId: params.draftId,
							errorMessage: message,
							attempt,
						},
					})
					return { ok: true }
				})
				.catch((callbackError: unknown) => {
					console.error('Failed to send draft processing failed callback', {
						draftId: params.draftId,
						error: getErrorMessage(callbackError),
						originalError: message,
					})
				})
			throw error
		}
	}
}

export default {
	async fetch() {
		return Response.json({ ok: true, service: 'call-kent-audio-workflow' })
	},
}
