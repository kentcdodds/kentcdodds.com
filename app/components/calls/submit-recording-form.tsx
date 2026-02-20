import * as React from 'react'
import {
	UNSAFE_SingleFetchRedirectSymbol,
	UNSAFE_decodeViaTurboStream,
	useNavigate,
} from 'react-router'
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
		return window.URL.createObjectURL(audio)
	}, [audio])
	const [submissionData, setSubmissionData] = React.useState(data)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [requestError, setRequestError] = React.useState<string | null>(null)

	React.useEffect(() => {
		setSubmissionData(data)
	}, [data])

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

					try {
						const dataUrl = `${window.location.pathname.replace(/\/$/, '')}.data`
						const response = await fetch(dataUrl, {
							method: 'POST',
							body,
							headers,
						})

						const contentType = response.headers.get('Content-Type') ?? ''
						if (contentType.includes('text/x-script')) {
							if (!response.body) {
								setRequestError('Unexpected response from server.')
								return
							}
							const decoded = await UNSAFE_decodeViaTurboStream(
								response.body,
								window,
							)
							const result = decoded.value
							if (result && typeof result === 'object') {
								const resultRecord = result as Record<PropertyKey, unknown>
								const symbolRedirect =
									resultRecord[UNSAFE_SingleFetchRedirectSymbol]
								const redirectData =
									symbolRedirect && typeof symbolRedirect === 'object'
										? (symbolRedirect as Record<string, unknown>)
										: resultRecord
								const redirectTo = redirectData.redirect
								if (typeof redirectTo === 'string') {
									const redirectUrl = new URL(
										redirectTo,
										window.location.origin,
									)
									void navigate(
										`${redirectUrl.pathname}${redirectUrl.search}`,
										{
											replace: redirectData.replace === true,
										},
									)
									return
								}
								if ('data' in resultRecord) {
									const actionData = resultRecord.data
									if (actionData && typeof actionData === 'object') {
										setSubmissionData(actionData as RecordingFormData)
										return
									}
								}
								if ('error' in resultRecord) {
									setRequestError(
										'Something went wrong submitting your recording.',
									)
									return
								}
							}
							setRequestError('Unexpected response from server.')
							return
						}

						const redirect = response.headers.get('X-Remix-Redirect')
						if (redirect) {
							const redirectUrl = new URL(redirect, window.location.origin)
							void navigate(`${redirectUrl.pathname}${redirectUrl.search}`, {
								replace: response.headers.get('X-Remix-Replace') === 'true',
							})
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
						console.error('Unable to submit recording', error)
						setRequestError('Unable to submit recording. Please try again.')
				}
			} finally {
				setIsSubmitting(false)
				}
			},
			{ once: true },
		)
	}

	return (
		<div>
			<div className="mb-12">
				{submissionData?.errors.generalError || requestError ? (
					<p id="audio-error-message" className="text-center text-red-500">
						{submissionData?.errors.generalError ?? requestError}
					</p>
				) : null}
				{audioURL ? (
					<audio
						src={audioURL}
						controls
						preload="metadata"
						aria-describedby="audio-error-message"
					/>
				) : (
					'loading...'
				)}
				{submissionData?.errors.audio ? (
					<p id="audio-error-message" className="text-center text-red-600">
						{submissionData.errors.audio}
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
