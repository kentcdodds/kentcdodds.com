import { clsx } from 'clsx'
import * as React from 'react'
import { Button } from '#app/components/button.tsx'
import { Field, FieldContainer, inputClassName } from '#app/components/form-elements.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import {
	callKentTextToSpeechConstraints,
	callKentTextToSpeechVoices,
	type CallKentTextToSpeechVoice,
	getErrorForCallKentQuestionText,
	getSuggestedCallTitleFromQuestionText,
} from '#app/utils/call-kent-text-to-speech.ts'

const textToSpeechResourcePath = '/resources/calls/text-to-speech'

function CharacterCountdown({
	id,
	value,
	maxLength,
	warnAt = 100,
}: {
	id?: string
	value: string
	maxLength: number
	warnAt?: number
}) {
	const remaining = maxLength - value.length
	const remainingDisplay = Math.max(0, remaining)
	let className = 'text-gray-500 dark:text-slate-400'
	if (remaining <= 0) className = 'text-red-500'
	else if (remaining <= warnAt) className = 'text-yellow-600 dark:text-yellow-500'

	return (
		<p
			id={id}
			className={`mt-2 text-right text-sm tabular-nums ${className}`}
			aria-live="polite"
		>
			{remainingDisplay} characters left
		</p>
	)
}

function isProbablyAudioResponse(response: Response) {
	const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
	return contentType.startsWith('audio/')
}

async function getErrorMessageFromResponse(response: Response) {
	const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
	if (contentType.includes('application/json')) {
		const json = (await response.json().catch(() => null)) as any
		const err =
			typeof json?.error === 'string'
				? json.error
				: typeof json?.message === 'string'
					? json.message
					: null
		if (err) return err
	}
	const text = await response.text().catch(() => '')
	return text.trim() || `Request failed (${response.status})`
}

function useFiveSecondPreview(audioRef: React.RefObject<HTMLAudioElement | null>) {
	const cleanupRef = React.useRef<(() => void) | null>(null)

	React.useEffect(() => {
		return () => cleanupRef.current?.()
	}, [])

	return React.useCallback(() => {
		const audio = audioRef.current
		if (!audio) return
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
		suggestedTitle: string
		voice: CallKentTextToSpeechVoice
	}) => void
}) {
	const idBase = React.useId()
	const questionId = `${idBase}-question`
	const questionCountdownId = `${questionId}-countdown`

	const defaultVoice = (callKentTextToSpeechVoices[0]?.id ??
		'asteria') as CallKentTextToSpeechVoice
	const [voice, setVoice] = React.useState<CallKentTextToSpeechVoice>(defaultVoice)
	const [questionText, setQuestionText] = React.useState('')

	const [isGenerating, setIsGenerating] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null)
	const [audioUrl, setAudioUrl] = React.useState<string | null>(null)
	const [durationSeconds, setDurationSeconds] = React.useState<number | null>(null)

	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const playPreview = useFiveSecondPreview(audioRef)

	React.useEffect(() => {
		return () => {
			if (audioUrl) URL.revokeObjectURL(audioUrl)
		}
	}, [audioUrl])

	// If the text/voice changes after generating, discard the stale audio.
	React.useEffect(() => {
		setError(null)
		setAudioBlob(null)
		setAudioUrl(null)
		setDurationSeconds(null)
	}, [voice, questionText])

	const questionError = React.useMemo(() => {
		// Only show hard validation for the current value; UX still gates on "Generate".
		return getErrorForCallKentQuestionText(questionText)
	}, [questionText])

	const suggestedTitle = React.useMemo(
		() => getSuggestedCallTitleFromQuestionText(questionText),
		[questionText],
	)

	async function generateAudio() {
		setError(null)

		const validationError = getErrorForCallKentQuestionText(questionText)
		if (validationError) {
			setError(validationError)
			return
		}

		setIsGenerating(true)
		try {
			const response = await fetch(textToSpeechResourcePath, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ text: questionText, voice }),
			})

			if (!response.ok || !isProbablyAudioResponse(response)) {
				const msg = await getErrorMessageFromResponse(response)
				setError(msg)
				return
			}

			const blob = await response.blob()
			if (!blob.type.startsWith('audio/')) {
				setError('Unexpected response while generating audio.')
				return
			}

			const nextUrl = URL.createObjectURL(blob)
			setAudioBlob(blob)
			setAudioUrl(nextUrl)

			// Best-effort auto-preview (will be allowed since it's triggered by a click).
			requestAnimationFrame(() => playPreview())
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Unable to generate audio.')
		} finally {
			setIsGenerating(false)
		}
	}

	const isTooLong = typeof durationSeconds === 'number' && durationSeconds > 120

	return (
		<div className="flex flex-col gap-6">
			<Paragraph className="mb-2">
				{`Type your question and we'll generate the audio for you. Tip: include a quick intro like "Hi Kent, my name is ..." so I know who you are.`}
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
					maxLength={callKentTextToSpeechConstraints.questionText.maxLength}
					aria-invalid={Boolean(questionError)}
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

			{suggestedTitle ? (
				<div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-slate-300">
					<div className="font-medium text-gray-700 dark:text-slate-200">
						Suggested title
					</div>
					<div>{suggestedTitle}</div>
				</div>
			) : null}

			{error ? <p className="text-red-500">{error}</p> : null}

			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					onClick={() => void generateAudio()}
					disabled={isGenerating}
				>
					{isGenerating ? 'Generating...' : 'Generate audio'}
				</Button>
				{audioBlob ? (
					<Button type="button" variant="secondary" onClick={playPreview}>
						Preview 5 seconds
					</Button>
				) : null}
			</div>

			{audioUrl ? (
				<div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
					<audio
						ref={audioRef}
						src={audioUrl}
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
							Duration: {Math.round(durationSeconds)}s{isTooLong ? ' (over 120s)' : ''}
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
									suggestedTitle,
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

