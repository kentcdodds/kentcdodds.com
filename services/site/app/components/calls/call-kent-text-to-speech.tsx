import { clsx } from 'clsx'
import * as React from 'react'
import { Button } from '#app/components/button.tsx'
import { CharacterCountdown } from '#app/components/character-countdown.tsx'
import {
	Field,
	FieldContainer,
	inputClassName,
} from '#app/components/form-elements.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import {
	callKentTextToSpeechConstraints,
	callKentTextToSpeechVoices,
	type CallKentTextToSpeechVoice,
	getCallKentVoicePreviewSrc,
	getErrorForCallKentQuestionText,
} from '#app/utils/call-kent-text-to-speech.ts'

const textToSpeechResourceRoute = '/resources/calls/text-to-speech'

function normalizeQuestionText(text: string) {
	return text.trim().replace(/\s+/g, ' ')
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

function isProbablyAudioResponse(response: Response) {
	const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
	return contentType.startsWith('audio/')
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
	const [hasAttemptedSave, setHasAttemptedSave] = React.useState(false)

	const [isGenerating, setIsGenerating] = React.useState(false)
	const [serverError, setServerError] = React.useState<string | null>(null)
	const requestIdRef = React.useRef(0)
	const abortControllerRef = React.useRef<AbortController | null>(null)

	const voicePreviewAudioRef = React.useRef<HTMLAudioElement | null>(null)
	const [voicePreviewError, setVoicePreviewError] = React.useState<
		string | null
	>(null)
	const voicePreviewSrc = getCallKentVoicePreviewSrc(voice)

	React.useEffect(() => {
		setVoicePreviewError(null)
	}, [voice])

	React.useEffect(() => {
		return () => abortControllerRef.current?.abort()
	}, [])

	React.useEffect(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
		requestIdRef.current += 1
		setIsGenerating(false)
		setServerError(null)
	}, [voice, questionText])

	const questionError = React.useMemo(() => {
		return getErrorForCallKentQuestionText(normalizeQuestionText(questionText))
	}, [questionText])

	function previewVoice() {
		setVoicePreviewError(null)

		const el = voicePreviewAudioRef.current
		if (!el) return

		try {
			el.pause()
		} catch {
			// ignore
		}
		try {
			el.currentTime = 0
		} catch {
			// ignore
		}

		void el.play().catch(() => {
			setVoicePreviewError(
				'Voice preview unavailable; run the generator script to create preview files.',
			)
		})
	}

	async function saveQuestion() {
		setHasAttemptedSave(true)
		setServerError(null)

		const validationError = getErrorForCallKentQuestionText(
			normalizeQuestionText(questionText),
		)
		if (validationError) {
			return
		}

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
				setServerError('Unexpected response while saving audio.')
				return
			}

			const objectUrl = URL.createObjectURL(blob)
			try {
				const durationSeconds = await new Promise<number>((resolve, reject) => {
					const el = new Audio()
					const cleanup = () => {
						el.removeEventListener('loadedmetadata', onLoadedMetadata)
						el.removeEventListener('error', onError)
					}
					const onLoadedMetadata = () => {
						cleanup()
						resolve(el.duration)
					}
					const onError = () => {
						cleanup()
						reject(new Error('Unable to read generated audio duration.'))
					}
					el.addEventListener('loadedmetadata', onLoadedMetadata)
					el.addEventListener('error', onError)
					el.preload = 'metadata'
					el.src = objectUrl
				})

				if (
					Number.isFinite(durationSeconds) &&
					durationSeconds >
						callKentTextToSpeechConstraints.maxAudioDurationSeconds
				) {
					setServerError(
						`Generated audio is longer than ${callKentTextToSpeechConstraints.maxAudioDurationSeconds}s. Please shorten your question and try again.`,
					)
					return
				}
			} finally {
				URL.revokeObjectURL(objectUrl)
			}

			onAcceptAudio({ audio: blob, questionText, voice })
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

	const showQuestionError = questionTouched || hasAttemptedSave
	const displayedQuestionError = showQuestionError ? questionError : null

	return (
		<div className="flex flex-col gap-6">
			<Paragraph className="mb-2">
				{`Type your question, pick a voice, and click "Save" to generate the audio. Tip: include a quick intro like "Hi Kent, my name is ..." so I know who you are.`}
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
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
						<select
							{...inputProps}
							className={clsx(inputClassName, 'appearance-none', 'sm:flex-1')}
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

						<Button type="button" variant="secondary" onClick={previewVoice}>
							Preview voice
						</Button>
					</div>
				)}
			</FieldContainer>

			<audio
				ref={voicePreviewAudioRef}
				src={voicePreviewSrc}
				preload="none"
				className="hidden"
				onError={() =>
					setVoicePreviewError(
						'Voice preview unavailable; run the generator script to create preview files.',
					)
				}
			/>

			{voicePreviewError ? (
				<p
					role="alert"
					aria-live="polite"
					aria-atomic="true"
					className="text-sm text-red-500"
				>
					{voicePreviewError}
				</p>
			) : null}

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
					onClick={() => void saveQuestion()}
					disabled={isGenerating}
				>
					{isGenerating ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>
	)
}
