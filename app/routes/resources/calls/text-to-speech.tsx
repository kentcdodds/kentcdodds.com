import { createHash } from 'node:crypto'
import { clsx } from 'clsx'
import * as React from 'react'
import { data as json } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { CharacterCountdown } from '#app/components/character-countdown.tsx'
import {
	Field,
	FieldContainer,
	inputClassName,
} from '#app/components/form-elements.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { cachified, cache } from '#app/utils/cache.server.ts'
import {
	AI_VOICE_DISCLOSURE_PREFIX,
	callKentTextToSpeechConstraints,
	callKentTextToSpeechVoices,
	type CallKentTextToSpeechVoice,
	getErrorForCallKentQuestionText,
	isCallKentTextToSpeechVoice,
} from '#app/utils/call-kent-text-to-speech.ts'
import {
	synthesizeSpeechWithWorkersAi,
} from '#app/utils/cloudflare-ai-text-to-speech.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { rateLimit } from '#app/utils/rate-limit.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/text-to-speech'

const textToSpeechResourceRoute = '/resources/calls/text-to-speech'

const TTS_RATE_LIMIT_MAX = 20
const TTS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
// This caches *unsubmitted* call audio, so keep the TTL modest.
const TTS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

function normalizeTextForCache(text: string) {
	// Normalize insignificant whitespace so repeated requests hit cache.
	return text.trim().replace(/\s+/g, ' ')
}

function withAiDisclosurePrefix(text: string) {
	const cleaned = text.trim()
	if (!cleaned) return cleaned
	const prefixLower = AI_VOICE_DISCLOSURE_PREFIX.toLowerCase()
	if (cleaned.toLowerCase().startsWith(prefixLower)) return cleaned
	return `${AI_VOICE_DISCLOSURE_PREFIX} ${cleaned}`
}

function stripAiDisclosurePrefix(text: string) {
	const cleaned = text.trim()
	if (!cleaned) return cleaned
	const prefixLower = AI_VOICE_DISCLOSURE_PREFIX.toLowerCase()
	if (!cleaned.toLowerCase().startsWith(prefixLower)) return cleaned
	return cleaned.slice(AI_VOICE_DISCLOSURE_PREFIX.length).trimStart()
}

function isDataWithResponseInit(value: unknown): value is {
	type: 'DataWithResponseInit'
	data: unknown
	init: ResponseInit | null
} {
	return (
		!!value &&
		typeof value === 'object' &&
		(value as { type?: string }).type === 'DataWithResponseInit'
	)
}

export async function action({ request }: Route.ActionArgs) {
	// This is a paid API call; require auth to limit abuse.
	const headers = { 'Cache-Control': 'no-store', Vary: 'Cookie' }

	const user = await getUser(request)
	if (!user) {
		return json(
			{ error: 'Login required to generate audio.' },
			{ status: 401, headers },
		)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400, headers })
	}

	const text = typeof (body as any)?.text === 'string' ? (body as any).text : ''
	const voiceRaw =
		typeof (body as any)?.voice === 'string' ? (body as any).voice : ''

	// Clients are not trusted to include the disclosure prefix, but if they do, we
	// strip it for validation so it can't satisfy min length by itself.
	const questionText = stripAiDisclosurePrefix(text)
	const textError = getErrorForCallKentQuestionText(questionText)
	if (textError) {
		return json({ error: textError }, { status: 400, headers })
	}

	if (voiceRaw && !isCallKentTextToSpeechVoice(voiceRaw)) {
		return json({ error: 'Invalid voice' }, { status: 400, headers })
	}

	const normalizedQuestionText = normalizeTextForCache(questionText)
	const speechText = withAiDisclosurePrefix(normalizedQuestionText)
	const model = getEnv().CLOUDFLARE_AI_TEXT_TO_SPEECH_MODEL
	// aura-2-en defaults to "luna" when omitted; treat empty voice as that for caching.
	const voiceForCache = voiceRaw || 'luna'
	const cacheKeyPayload = JSON.stringify({
		v: 2,
		model,
		voice: voiceForCache,
		text: speechText,
	})
	const cacheKeyHash = createHash('sha256')
		.update(cacheKeyPayload)
		.digest('hex')
	const cacheKey = `call-kent-tts:audio:v2:${cacheKeyHash}`

	try {
		const cached = await cachified({
			cache,
			key: cacheKey,
			ttl: TTS_CACHE_TTL_MS,
			checkValue: (value: unknown) => {
				if (!value || typeof value !== 'object') return false
				const obj = value as Record<string, unknown>
				const bytes = obj.bytes
				const contentType = obj.contentType
				if (!(bytes instanceof Uint8Array)) return false
				if (typeof contentType !== 'string') return false
				return true
			},
			getFreshValue: async () => {
				// Only rate-limit *cache misses* (paid Workers AI calls).
				const limit = rateLimit({
					key: `call-kent-tts:${user.id}`,
					max: TTS_RATE_LIMIT_MAX,
					windowMs: TTS_RATE_LIMIT_WINDOW_MS,
				})
				if (!limit.allowed) {
					const retryAfterSeconds = Math.ceil((limit.retryAfterMs ?? 0) / 1000)
					throw json(
						{
							error: `Too many text-to-speech requests. Try again in ${retryAfterSeconds}s.`,
						},
						{
							status: 429,
							headers: {
								...headers,
								'Retry-After': String(retryAfterSeconds),
							},
						},
					)
				}

				const { bytes, contentType } = await synthesizeSpeechWithWorkersAi({
					text: speechText,
					voice: voiceRaw || undefined,
					model,
				})
				// Ensure we store a Buffer so the cache's base64 serializer works.
				return {
					bytes: Buffer.from(bytes),
					contentType: contentType || 'audio/mpeg',
				}
			},
		})

		const { bytes, contentType } = cached
		// Some TS `fetch`/`Response` typings don't accept all `Uint8Array` variants.
		// Normalize into an `ArrayBuffer` body for broad compatibility.
		const responseBody =
			bytes.buffer instanceof ArrayBuffer
				? bytes.buffer.slice(
						bytes.byteOffset,
						bytes.byteOffset + bytes.byteLength,
					)
				: Uint8Array.from(bytes).buffer
		return new Response(responseBody, {
			headers: {
				...headers,
				'Content-Type': contentType,
			},
		})
	} catch (error: unknown) {
		if (error instanceof Response) {
			return error
		}
		if (isDataWithResponseInit(error)) {
			return error
		}
		console.error('Call Kent TTS failed', error)
		return json(
			{ error: 'Unable to generate audio. Please try again.' },
			{ status: 500, headers },
		)
	}
}

function isProbablyAudioResponse(response: Response) {
	const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
	return contentType.startsWith('audio/')
}

async function getErrorMessageFromResponse(response: Response) {
	const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
	const bodyText = await response.text().catch(() => '')
	if (contentType.includes('application/json')) {
		const parsed = (() => {
			try {
				return JSON.parse(bodyText) as unknown
			} catch {
				return null
			}
		})()
		const obj =
			parsed && typeof parsed === 'object'
				? (parsed as Record<string, unknown>)
				: null
		const err =
			typeof obj?.error === 'string'
				? obj.error
				: typeof obj?.message === 'string'
					? obj.message
					: null
		if (err) return err
	}
	return bodyText.trim() || `Request failed (${response.status})`
}

function useFiveSecondPreview(
	audioRef: React.RefObject<HTMLAudioElement | null>,
) {
	const cleanupRef = React.useRef<(() => void) | null>(null)

	React.useEffect(() => {
		return () => cleanupRef.current?.()
	}, [])

	return React.useCallback(() => {
		const audio = audioRef.current
		if (!audio) return
		// Capture a non-null element for the hoisted handlers.
		const audioEl = audio

		// Stop any previous preview listeners.
		cleanupRef.current?.()
		cleanupRef.current = null

		const stopAtSeconds = 5
		let cleanedUp = false

		function cleanup() {
			if (cleanedUp) return
			cleanedUp = true
			audioEl.removeEventListener('timeupdate', onTimeUpdate)
			audioEl.removeEventListener('ended', cleanup)
			cleanupRef.current = null
		}

		function onTimeUpdate() {
			if (audioEl.currentTime >= stopAtSeconds) {
				audioEl.pause()
				try {
					audioEl.currentTime = 0
				} catch {
					// ignore
				}
				cleanup()
			}
		}

		audioEl.addEventListener('timeupdate', onTimeUpdate)
		audioEl.addEventListener('ended', cleanup)
		cleanupRef.current = cleanup

		try {
			audioEl.currentTime = 0
		} catch {
			// ignore
		}
		void audioEl.play().catch(() => cleanup())
	}, [audioRef])
}

export function CallKentTextToSpeech({
	onAcceptAudio,
}: {
	onAcceptAudio: (args: {
		audio: Blob
		questionText: string
		voice: CallKentTextToSpeechVoice
	}) => void
}) {
	const idBase = React.useId()
	const questionId = `${idBase}-question`
	const questionCountdownId = `${questionId}-countdown`

	const defaultVoice = (callKentTextToSpeechVoices[0]?.id ??
		'luna') as CallKentTextToSpeechVoice
	const [voice, setVoice] =
		React.useState<CallKentTextToSpeechVoice>(defaultVoice)
	const [questionText, setQuestionText] = React.useState('')
	const [questionTouched, setQuestionTouched] = React.useState(false)
	const [hasAttemptedPreview, setHasAttemptedPreview] = React.useState(false)

	const [isGenerating, setIsGenerating] = React.useState(false)
	const [serverError, setServerError] = React.useState<string | null>(null)
	const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
	const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
	const [durationSeconds, setDurationSeconds] = React.useState<number | null>(
		null,
	)
	const requestIdRef = React.useRef(0)
	const abortControllerRef = React.useRef<AbortController | null>(null)

	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const playPreview = useFiveSecondPreview(audioRef)

	React.useEffect(() => {
		return () => {
			if (audioUrl) URL.revokeObjectURL(audioUrl)
		}
	}, [audioUrl])

	React.useEffect(() => {
		return () => abortControllerRef.current?.abort()
	}, [])

	// If the text/voice changes after generating, discard the stale audio.
	React.useEffect(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
		requestIdRef.current += 1
		setIsGenerating(false)
		setServerError(null)
		setAudioBlob(null)
		setAudioUrl(null)
		setDurationSeconds(null)
	}, [voice, questionText])

	const questionError = React.useMemo(() => {
		// Only show hard validation for the current value; UX still gates on "Preview".
		return getErrorForCallKentQuestionText(questionText)
	}, [questionText])

	async function previewAudio() {
		setHasAttemptedPreview(true)
		setServerError(null)

		const validationError = getErrorForCallKentQuestionText(questionText)
		if (validationError) {
			return
		}

		// If we already have audio for the current text/voice, just replay the preview.
		if (audioUrl) {
			playPreview()
			return
		}

		// Clear any prior audio result so UI can't reflect stale duration state.
		try {
			audioRef.current?.pause()
		} catch {
			// ignore
		}
		setAudioBlob(null)
		setAudioUrl(null)
		setDurationSeconds(null)

		abortControllerRef.current?.abort()
		const requestId = requestIdRef.current + 1
		requestIdRef.current = requestId
		const abortController = new AbortController()
		abortControllerRef.current = abortController
		setIsGenerating(true)
		try {
			const response = await fetch(textToSpeechResourceRoute, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ text: questionText, voice }),
				signal: abortController.signal,
			})

			if (requestIdRef.current !== requestId) return
			if (!response.ok || !isProbablyAudioResponse(response)) {
				const msg = await getErrorMessageFromResponse(response)
				if (requestIdRef.current !== requestId) return
				setServerError(msg)
				return
			}

			const blob = await response.blob()
			if (requestIdRef.current !== requestId) return
			if (!blob.type.startsWith('audio/')) {
				setServerError('Unexpected response while generating audio.')
				return
			}

			const nextUrl = URL.createObjectURL(blob)
			setAudioBlob(blob)
			setAudioUrl(nextUrl)

			// Best-effort auto-preview (will be allowed since it's triggered by a click).
			requestAnimationFrame(() => playPreview())
		} catch (e: unknown) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				return
			}
			if (requestIdRef.current !== requestId) return
			setServerError(
				e instanceof Error ? e.message : 'Unable to generate audio.',
			)
		} finally {
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null
			}
			if (requestIdRef.current === requestId) {
				setIsGenerating(false)
			}
		}
	}

	const isTooLong =
		typeof durationSeconds === 'number' &&
		durationSeconds > callKentTextToSpeechConstraints.maxAudioDurationSeconds
	const showQuestionError = questionTouched || hasAttemptedPreview
	const displayedQuestionError = showQuestionError ? questionError : null

	return (
		<div className="flex flex-col gap-6">
			<Paragraph className="mb-2">
				{`Type your question and preview the audio before you submit it. Tip: include a quick intro like "Hi Kent, my name is ..." so I know who you are.`}
			</Paragraph>

			<div>
				<Field
					id={questionId}
					name="questionText"
					label="Your question"
					type="textarea"
					value={questionText}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
						setQuestionText(e.currentTarget.value)
					}
					onBlur={() => setQuestionTouched(true)}
					maxLength={callKentTextToSpeechConstraints.questionText.maxLength}
					aria-invalid={showQuestionError && Boolean(questionError)}
					error={displayedQuestionError}
					additionalAriaDescribedBy={questionCountdownId}
					className="mb-2"
				/>
				<CharacterCountdown
					id={questionCountdownId}
					value={questionText}
					maxLength={callKentTextToSpeechConstraints.questionText.maxLength}
					warnAt={200}
				/>
			</div>

			<FieldContainer label="Voice">
				{({ inputProps }) => (
					<select
						{...inputProps}
						className={clsx(inputClassName, 'appearance-none')}
						value={voice}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
							setVoice(e.currentTarget.value as CallKentTextToSpeechVoice)
						}
					>
						{callKentTextToSpeechVoices.map((v) => (
							<option key={v.id} value={v.id}>
								{v.label}
							</option>
						))}
					</select>
				)}
			</FieldContainer>

			{serverError ? (
				<p
					role="alert"
					aria-live="assertive"
					aria-atomic="true"
					className="text-red-500"
				>
					{serverError}
				</p>
			) : null}

			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					onClick={() => void previewAudio()}
					disabled={isGenerating}
				>
					{isGenerating ? 'Preparing preview...' : 'Preview audio'}
				</Button>
			</div>

			{audioUrl ? (
				<div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
					<audio
						ref={audioRef}
						src={audioUrl}
						aria-label="Generated audio playback"
						controls
						preload="metadata"
						className="w-full"
						onLoadedMetadata={(e) => {
							const el = e.currentTarget
							const d = el.duration
							setDurationSeconds(Number.isFinite(d) ? d : null)
						}}
					/>
					{typeof durationSeconds === 'number' ? (
						<p
							className={clsx('mt-2 text-sm', {
								'text-gray-600 dark:text-slate-300': !isTooLong,
								'text-red-600 dark:text-red-400': isTooLong,
							})}
						>
							Duration: {Math.round(durationSeconds)}s
							{isTooLong
								? ` (over ${callKentTextToSpeechConstraints.maxAudioDurationSeconds}s)`
								: ''}
						</p>
					) : null}

					<div className="mt-4 flex flex-wrap gap-3">
						<Button
							type="button"
							onClick={() => {
								if (!audioBlob) return
								onAcceptAudio({
									audio: audioBlob,
									questionText,
									voice,
								})
							}}
							disabled={!audioBlob || isTooLong}
						>
							Use this audio
						</Button>
						<Button
							type="button"
							variant="secondary"
							onClick={() => {
								setAudioBlob(null)
								setAudioUrl(null)
								setDurationSeconds(null)
							}}
						>
							Change text/voice
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
}
