import * as React from 'react'
import { useNavigate } from 'react-router'
import { decodeSingleFetchResponse } from '#app/utils/react-router-single-fetch.client.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { Button } from '../button.tsx'
import { Field } from '../form-elements.tsx'

type RecordingFormData = {
	fields: {
		// audio is too big to include in the session
		// hopefully it won't matter with fully client-side interactions though
		audio?: never
		title?: string | null
		description?: string | null
		keywords?: string | null
	}
	errors: {
		generalError?: string
		audio?: string | null
		title?: string | null
		description?: string | null
		keywords?: string | null
	}
}

function RecordingForm({
	audio,
	data,
}: {
	audio: Blob
	data?: RecordingFormData
}) {
	const navigate = useNavigate()
	const {
		requestInfo: { flyPrimaryInstance },
	} = useRootData()
	const audioURL = React.useMemo(() => {
		return URL.createObjectURL(audio)
	}, [audio])
	const [submissionData, setSubmissionData] = React.useState(data)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [requestError, setRequestError] = React.useState<string | null>(null)
	const abortControllerRef = React.useRef<AbortController | null>(null)

	React.useEffect(() => {
		return () => URL.revokeObjectURL(audioURL)
	}, [audioURL])

	React.useEffect(() => {
		setSubmissionData(data)
	}, [data])

	React.useEffect(() => {
		return () => abortControllerRef.current?.abort()
	}, [])

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (isSubmitting) return
		setRequestError(null)
		setIsSubmitting(true)

		const form = new FormData(event.currentTarget)
		const reader = new FileReader()
		reader.readAsDataURL(audio)
		reader.addEventListener(
			'loadend',
			async () => {
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
						const dataUrl = `${window.location.pathname.replace(/\/$/, '')}.data`
						const response = await fetch(dataUrl, {
							method: 'POST',
							body,
							headers,
							signal: abortController.signal,
						})

						const contentType = response.headers.get('Content-Type') ?? ''
						if (contentType.includes('text/x-script')) {
							if (!response.body) {
								setRequestError('Unexpected response from server.')
								return
							}
							const decoded = await decodeSingleFetchResponse(response.body)
							if (decoded.type === 'redirect') {
								const redirectUrl = new URL(
									decoded.redirect,
									window.location.origin,
								)
								void navigate(`${redirectUrl.pathname}${redirectUrl.search}`, {
									replace: decoded.replace,
								})
								return
							}
							if (decoded.type === 'data') {
								if (decoded.data && typeof decoded.data === 'object') {
									setSubmissionData(decoded.data as RecordingFormData)
									return
								}
								setRequestError('Unexpected response from server.')
								return
							}
							if (decoded.type === 'error') {
								setRequestError('Something went wrong submitting your recording.')
								return
							}
							setRequestError('Unexpected response from server.')
							return
						}

						if (!response.ok) {
							const actionData = await response.json().catch(() => null)
							if (actionData && typeof actionData === 'object') {
								setSubmissionData(actionData as RecordingFormData)
							} else {
								setRequestError(
									'Something went wrong submitting your recording.',
								)
							}
							return
						}

						setRequestError('Unexpected response from server.')
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
			},
			{ once: true },
		)
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

			<form method="post" onSubmit={handleSubmit}>
				<Field
					name="title"
					label="Title"
					defaultValue={submissionData?.fields.title ?? ''}
					error={submissionData?.errors.title}
				/>
				<Field
					error={submissionData?.errors.description}
					name="description"
					label="Description"
					type="textarea"
					defaultValue={submissionData?.fields.description ?? ''}
				/>

				<Field
					error={submissionData?.errors.keywords}
					label="Keywords"
					description="comma separated values"
					name="keywords"
					defaultValue={submissionData?.fields.keywords ?? ''}
				/>

				<Button type="submit" className="mt-8" disabled={isSubmitting}>
					{isSubmitting ? 'Submitting...' : 'Submit Recording'}
				</Button>
			</form>
		</div>
	)
}

export type { RecordingFormData }
export { RecordingForm }
