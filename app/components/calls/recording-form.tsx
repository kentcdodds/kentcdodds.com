import * as React from 'react'
import { useNavigate, useRevalidator } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { EpisodeArtworkPreview } from '#app/components/calls/episode-artwork-preview.tsx'
import { CharacterCountdown } from '#app/components/character-countdown.tsx'
import { Field } from '#app/components/form-elements.tsx'
import {
	callKentFieldConstraints,
	getErrorForNotes,
	getErrorForTitle,
} from '#app/utils/call-kent.ts'
import { getStringFormValue } from '#app/utils/misc.ts'
import { useRootData } from '#app/utils/use-root-data.ts'

export const recordingFormActionPath = '/resources/calls/save'

export function getNavigationPathFromResponse(response: Response) {
	if (!response.redirected || !response.url) return null
	const redirectUrl = new URL(response.url, window.location.origin)
	return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
}

export type RecordingFormData = {
	fields: {
		// audio is too big to include in the session
		// hopefully it won't matter with fully client-side interactions though
		audio?: never
		title?: string | null
		notes?: string | null
	}
	errors: {
		generalError?: string
		audio?: string | null
		title?: string | null
		notes?: string | null
	}
}

type RecordingIntent = 'create-call' | 'delete-call'
export type RecordingSubmitIntent = Exclude<RecordingIntent, 'delete-call'>
type RecordingTextFieldName = 'title' | 'notes'

function isRecordingFormDataEqual(
	first?: RecordingFormData,
	second?: RecordingFormData,
) {
	if (first === second) return true
	if (!first || !second) return false
	return (
		first.fields.title === second.fields.title &&
		first.fields.notes === second.fields.notes &&
		first.errors.generalError === second.errors.generalError &&
		first.errors.audio === second.errors.audio &&
		first.errors.title === second.errors.title &&
		first.errors.notes === second.errors.notes
	)
}

export function RecordingForm({
	audio,
	data,
	intent,
	callId,
}: {
	audio: Blob
	data?: RecordingFormData
	intent: RecordingSubmitIntent
	callId?: string
}) {
	const navigate = useNavigate()
	const revalidator = useRevalidator()
	const { requestInfo, user, userInfo } = useRootData()
	const flyPrimaryInstance = requestInfo.flyPrimaryInstance
	const audioURL = React.useMemo(() => {
		return URL.createObjectURL(audio)
	}, [audio])
	const [submissionData, setSubmissionData] = React.useState(data)
	const idBase = React.useId()
	const titleId = `${idBase}-title`
	const titleCountdownId = `${titleId}-countdown`
	const notesId = `${idBase}-notes`
	const notesCountdownId = `${notesId}-countdown`
	const [fieldValues, setFieldValues] = React.useState(() => ({
		title: data?.fields.title ?? '',
		notes: data?.fields.notes ?? '',
	}))
	const [fieldInteracted, setFieldInteracted] = React.useState(() => ({
		title: false,
		notes: false,
	}))
	const [isAnonymous, setIsAnonymous] = React.useState(false)
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [requestError, setRequestError] = React.useState<string | null>(null)
	const previousPropData = React.useRef(data)
	const abortControllerRef = React.useRef<AbortController | null>(null)

	React.useEffect(() => {
		return () => URL.revokeObjectURL(audioURL)
	}, [audioURL])

	React.useEffect(() => {
		if (isRecordingFormDataEqual(previousPropData.current, data)) return
		previousPropData.current = data
		setSubmissionData(data)
		setFieldValues({
			title: data?.fields.title ?? '',
			notes: data?.fields.notes ?? '',
		})
		setFieldInteracted({ title: false, notes: false })
		setHasAttemptedSubmit(false)
	}, [data])

	React.useEffect(() => {
		return () => abortControllerRef.current?.abort()
	}, [])

	function markInteracted(field: RecordingTextFieldName) {
		setFieldInteracted((prev) =>
			prev[field] ? prev : { ...prev, [field]: true },
		)
	}

	function handleTextFieldChange(field: RecordingTextFieldName) {
		return (
			event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => {
			const value = event.currentTarget.value
			setFieldValues((prev) =>
				prev[field] === value ? prev : { ...prev, [field]: value },
			)
			// Keep the values in sync for counters + validation, but do not show errors
			// until the field is blurred or the user attempts to submit.
			setSubmissionData((prev) =>
				prev
					? {
							...prev,
							errors: {
								...(prev.errors ?? {}),
								generalError: undefined,
								[field]: null,
							} as RecordingFormData['errors'],
						}
					: prev,
			)
		}
	}

	function handleTextFieldBlur(field: RecordingTextFieldName) {
		return () => markInteracted(field)
	}

	const clientErrors = React.useMemo(
		() => ({
			title: getErrorForTitle(fieldValues.title),
			notes: getErrorForNotes(fieldValues.notes),
		}),
		[fieldValues.title, fieldValues.notes],
	)

	// Prefer client-side errors for the current value, but fall back to server
	// errors from the last submission attempt when client validation passes.
	const displayedErrors = {
		title: clientErrors.title ?? submissionData?.errors.title ?? null,
		notes: clientErrors.notes ?? submissionData?.errors.notes ?? null,
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (isSubmitting) return
		setRequestError(null)

		const form = new FormData(event.currentTarget)
		const title = getStringFormValue(form, 'title') ?? ''
		setHasAttemptedSubmit(true)
		const notes = getStringFormValue(form, 'notes') ?? ''
		setFieldValues({ title, notes })

		const preflightErrors = {
			title: getErrorForTitle(title),
			notes: getErrorForNotes(notes),
		}
		if (Object.values(preflightErrors).some(Boolean)) {
			// Client-side validation matches server rules; don't upload audio until valid.
			return
		}

		const reader = new FileReader()
		const handleLoadEnd = async () => {
			try {
				if (typeof reader.result !== 'string') {
					setRequestError('Unable to read recording. Please try again.')
					return
				}
				form.append('audio', reader.result)

				const body = new URLSearchParams()
				for (const [key, value] of form.entries()) {
					if (typeof value === 'string') {
						body.append(key, value)
					}
				}

				const headers = new Headers({
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				})
				if (flyPrimaryInstance) {
					headers.set('fly-force-instance-id', flyPrimaryInstance)
				}
				const abortController = new AbortController()
				abortControllerRef.current = abortController

				try {
					const response = await fetch(recordingFormActionPath, {
						method: 'POST',
						body,
						headers,
						signal: abortController.signal,
					})

					const redirectPath = getNavigationPathFromResponse(response)
					if (redirectPath) {
						await navigate(redirectPath)
						return
					}

					if (response.ok) {
						await revalidator.revalidate()
						return
					}

					const actionData = await response.json().catch(() => null)
					if (actionData && typeof actionData === 'object') {
						setSubmissionData(actionData as RecordingFormData)
					} else {
						setRequestError('Something went wrong submitting your recording.')
					}
					return
				} catch (error: unknown) {
					if (error instanceof DOMException && error.name === 'AbortError') {
						return
					}
					console.error('Unable to submit recording', error)
					setRequestError('Unable to submit recording. Please try again.')
				} finally {
					if (abortControllerRef.current === abortController) {
						abortControllerRef.current = null
					}
				}
			} finally {
				setIsSubmitting(false)
			}
		}
		reader.addEventListener('loadend', handleLoadEnd, { once: true })
		setIsSubmitting(true)
		try {
			reader.readAsDataURL(audio)
		} catch (error: unknown) {
			reader.removeEventListener('loadend', handleLoadEnd)
			console.error('Unable to read recording', error)
			setRequestError('Unable to read recording. Please try again.')
			setIsSubmitting(false)
		}
	}

	const generalError = submissionData?.errors.generalError || requestError
	const audioError = submissionData?.errors.audio
	const audioDescribedBy = [
		generalError ? 'general-error-message' : null,
		audioError ? 'audio-error-message' : null,
	]
		.filter(Boolean)
		.join(' ')

	return (
		<div>
			<div className="mb-12">
				{generalError ? (
					<p id="general-error-message" className="text-center text-red-500">
						{generalError}
					</p>
				) : null}
				{audioURL ? (
					<audio
						src={audioURL}
						controls
						preload="metadata"
						aria-describedby={audioDescribedBy || undefined}
					/>
				) : (
					'loading...'
				)}
				{audioError ? (
					<p id="audio-error-message" className="text-center text-red-600">
						{audioError}
					</p>
				) : null}
			</div>

			<form method="post" onSubmit={handleSubmit} noValidate>
				<input type="hidden" name="intent" value={intent} />
				{callId ? <input type="hidden" name="callId" value={callId} /> : null}

				{intent === 'create-call' && user && userInfo ? (
					<EpisodeArtworkPreview
						title={fieldValues.title}
						email={user.email}
						firstName={user.firstName}
						team={user.team}
						origin={requestInfo.origin}
						hasGravatar={userInfo.avatar.hasGravatar}
						isAnonymous={isAnonymous}
						onAnonymousChange={setIsAnonymous}
					/>
				) : null}

				<div className="mb-8">
					<Field
						id={titleId}
						name="title"
						label="Title"
						maxLength={callKentFieldConstraints.title.maxLength}
						onChange={handleTextFieldChange('title')}
						onBlur={handleTextFieldBlur('title')}
						value={fieldValues.title}
						additionalAriaDescribedBy={titleCountdownId}
						aria-invalid={
							Boolean(displayedErrors.title) &&
							(hasAttemptedSubmit || fieldInteracted.title)
						}
						error={
							hasAttemptedSubmit || fieldInteracted.title
								? displayedErrors.title
								: null
						}
						className="mb-2"
					/>
					<CharacterCountdown
						id={titleCountdownId}
						value={fieldValues.title}
						maxLength={callKentFieldConstraints.title.maxLength}
						warnAt={10}
					/>
				</div>
				<div className="mb-8">
					<Field
						id={notesId}
						name="notes"
						label="Notes (optional)"
						type="textarea"
						required={false}
						maxLength={callKentFieldConstraints.notes.maxLength}
						onChange={handleTextFieldChange('notes')}
						onBlur={handleTextFieldBlur('notes')}
						value={fieldValues.notes}
						additionalAriaDescribedBy={notesCountdownId}
						aria-invalid={
							Boolean(displayedErrors.notes) &&
							(hasAttemptedSubmit || fieldInteracted.notes)
						}
						error={
							hasAttemptedSubmit || fieldInteracted.notes
								? displayedErrors.notes
								: null
						}
						className="mb-2"
					/>
					<CharacterCountdown
						id={notesCountdownId}
						value={fieldValues.notes}
						maxLength={callKentFieldConstraints.notes.maxLength}
						warnAt={100}
					/>
				</div>

				<Button type="submit" className="mt-8" disabled={isSubmitting}>
					{isSubmitting ? 'Submitting...' : 'Submit Recording'}
				</Button>
			</form>
		</div>
	)
}
