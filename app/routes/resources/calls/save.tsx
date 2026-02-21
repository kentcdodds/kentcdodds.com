import { format } from 'date-fns'
import * as React from 'react'
import { data as json, redirect, useNavigate, useRevalidator } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { Field } from '#app/components/form-elements.tsx'
import {
	callKentFieldConstraints,
	getErrorForAudio,
	getErrorForDescription,
	getErrorForKeywords,
	getErrorForTitle,
} from '#app/utils/call-kent.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/save'

const recordingFormActionPath = '/resources/calls/save'

function getNavigationPathFromResponse(response: Response) {
	if (!response.redirected || !response.url) return null
	const redirectUrl = new URL(response.url, window.location.origin)
	return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
}

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

type ActionData = RecordingFormData
type RecordingIntent = 'create-call' | 'publish-call' | 'delete-call'
type RecordingSubmitIntent = Exclude<RecordingIntent, 'delete-call'>
type RecordingTextFieldName = 'title' | 'description' | 'keywords'

function isRecordingFormDataEqual(
	first?: RecordingFormData,
	second?: RecordingFormData,
) {
	if (first === second) return true
	if (!first || !second) return false
	return (
		first.fields.title === second.fields.title &&
		first.fields.description === second.fields.description &&
		first.fields.keywords === second.fields.keywords &&
		first.errors.generalError === second.errors.generalError &&
		first.errors.audio === second.errors.audio &&
		first.errors.title === second.errors.title &&
		first.errors.description === second.errors.description &&
		first.errors.keywords === second.errors.keywords
	)
}

function CharacterCountdown({
	id,
	value,
	maxLength,
	warnAt = 10,
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

function RecordingForm({
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
	const {
		requestInfo: { flyPrimaryInstance },
	} = useRootData()
	const audioURL = React.useMemo(() => {
		return URL.createObjectURL(audio)
	}, [audio])
	const [submissionData, setSubmissionData] = React.useState(data)
	const idBase = React.useId()
	const titleId = `${idBase}-title`
	const titleCountdownId = `${titleId}-countdown`
	const descriptionId = `${idBase}-description`
	const descriptionCountdownId = `${descriptionId}-countdown`
	const keywordsId = `${idBase}-keywords`
	const keywordsCountdownId = `${keywordsId}-countdown`
	const [fieldValues, setFieldValues] = React.useState(() => ({
		title: data?.fields.title ?? '',
		description: data?.fields.description ?? '',
		keywords: data?.fields.keywords ?? '',
	}))
	const [fieldInteracted, setFieldInteracted] = React.useState(() => ({
		title: false,
		description: false,
		keywords: false,
	}))
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
			description: data?.fields.description ?? '',
			keywords: data?.fields.keywords ?? '',
		})
		setFieldInteracted({ title: false, description: false, keywords: false })
		setHasAttemptedSubmit(false)
	}, [data])

	React.useEffect(() => {
		return () => abortControllerRef.current?.abort()
	}, [])

	function markInteracted(field: RecordingTextFieldName) {
		setFieldInteracted((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
	}

	function handleTextFieldChange(field: RecordingTextFieldName) {
		return (
			event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => {
			const value = event.currentTarget.value
			setFieldValues((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }))
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
			description: getErrorForDescription(fieldValues.description),
			keywords: getErrorForKeywords(fieldValues.keywords),
		}),
		[fieldValues.title, fieldValues.description, fieldValues.keywords],
	)

	// Prefer client-side errors for the current value, but fall back to server
	// errors from the last submission attempt when client validation passes.
	const displayedErrors = {
		title: clientErrors.title ?? submissionData?.errors.title ?? null,
		description:
			clientErrors.description ?? submissionData?.errors.description ?? null,
		keywords: clientErrors.keywords ?? submissionData?.errors.keywords ?? null,
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (isSubmitting) return
		setRequestError(null)

		const form = new FormData(event.currentTarget)
		const title = getStringFormValue(form, 'title') ?? ''
		const description = getStringFormValue(form, 'description') ?? ''
		const keywords = getStringFormValue(form, 'keywords') ?? ''
		setHasAttemptedSubmit(true)
		setFieldValues({ title, description, keywords })

		const preflightErrors = {
			title: getErrorForTitle(title),
			description: getErrorForDescription(description),
			keywords: getErrorForKeywords(keywords),
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
		reader.addEventListener(
			'loadend',
			handleLoadEnd,
			{ once: true },
		)
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
						id={descriptionId}
						name="description"
						label="Description"
						type="textarea"
						maxLength={callKentFieldConstraints.description.maxLength}
						onChange={handleTextFieldChange('description')}
						onBlur={handleTextFieldBlur('description')}
						value={fieldValues.description}
						additionalAriaDescribedBy={descriptionCountdownId}
						aria-invalid={
							Boolean(displayedErrors.description) &&
							(hasAttemptedSubmit || fieldInteracted.description)
						}
						error={
							hasAttemptedSubmit || fieldInteracted.description
								? displayedErrors.description
								: null
						}
						className="mb-2"
					/>
					<CharacterCountdown
						id={descriptionCountdownId}
						value={fieldValues.description}
						maxLength={callKentFieldConstraints.description.maxLength}
						warnAt={100}
					/>
				</div>

				<div className="mb-8">
					<Field
						id={keywordsId}
						label="Keywords"
						description="comma separated values"
						name="keywords"
						maxLength={callKentFieldConstraints.keywords.maxLength}
						onChange={handleTextFieldChange('keywords')}
						onBlur={handleTextFieldBlur('keywords')}
						value={fieldValues.keywords}
						additionalAriaDescribedBy={keywordsCountdownId}
						aria-invalid={
							Boolean(displayedErrors.keywords) &&
							(hasAttemptedSubmit || fieldInteracted.keywords)
						}
						error={
							hasAttemptedSubmit || fieldInteracted.keywords
								? displayedErrors.keywords
								: null
						}
						className="mb-2"
					/>
					<CharacterCountdown
						id={keywordsCountdownId}
						value={fieldValues.keywords}
						maxLength={callKentFieldConstraints.keywords.maxLength}
						warnAt={10}
					/>
				</div>

				<Button type="submit" className="mt-8" disabled={isSubmitting}>
					{isSubmitting ? 'Submitting...' : 'Submit Recording'}
				</Button>
			</form>
		</div>
	)
}

function getStringFormValue(formData: FormData, key: string) {
	const value = formData.get(key)
	return typeof value === 'string' ? value : null
}

function getActionData(formData: FormData) {
	const fields = {
		audio: getStringFormValue(formData, 'audio'),
		title: getStringFormValue(formData, 'title'),
		description: getStringFormValue(formData, 'description'),
		keywords: getStringFormValue(formData, 'keywords'),
	}

	const actionData: ActionData = {
		fields: {
			title: fields.title,
			description: fields.description,
			keywords: fields.keywords,
		},
		errors: {
			audio: getErrorForAudio(fields.audio),
			title: getErrorForTitle(fields.title),
			description: getErrorForDescription(fields.description),
			keywords: getErrorForKeywords(fields.keywords),
		},
	}

	return { actionData, fields }
}

function hasActionErrors(actionData: ActionData) {
	return Object.values(actionData.errors).some((error) => error !== null)
}

function redirectCallNotFound() {
	const searchParams = new URLSearchParams()
	searchParams.set('message', 'Call not found')
	return redirect(`/calls/admin?${searchParams.toString()}`)
}

async function createCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const { actionData, fields } = getActionData(formData)
	if (hasActionErrors(actionData)) {
		return json(actionData, 400)
	}

	try {
		const [
			{ sendMessageFromDiscordBot },
			{
				getDomainUrl,
				getOptionalTeam,
				getRequiredServerEnvVar,
			},
			{ prisma },
			{ requireUser },
			{ teamEmoji },
		] = await Promise.all([
			import('#app/utils/discord.server.ts'),
			import('#app/utils/misc.tsx'),
			import('#app/utils/prisma.server.ts'),
			import('#app/utils/session.server.ts'),
			import('#app/utils/team-provider.tsx'),
		])

		const user = await requireUser(request)
		const domainUrl = getDomainUrl(request)
		const { audio, title, description, keywords } = fields
		if (!audio || !title || !description || !keywords) {
			return json(actionData, 400)
		}

		const createdCall = await prisma.call.create({
			data: {
				title,
				description,
				keywords,
				userId: user.id,
				base64: audio,
			},
		})

		try {
			const channelId = getRequiredServerEnvVar('DISCORD_PRIVATE_BOT_CHANNEL')
			const adminUserId = getRequiredServerEnvVar('DISCORD_ADMIN_USER_ID')
			const { firstName, team, discordId } = user
			const userMention = discordId ? `<@!${discordId}>` : firstName
			const emoji = teamEmoji[getOptionalTeam(team)]
			const message = `📳 <@!${adminUserId}> ring ring! New call from ${userMention} ${emoji}: "${title}"\n\n${description}\n\n${domainUrl}/calls/admin/${createdCall.id}`
			void sendMessageFromDiscordBot(channelId, message)
		} catch (error: unknown) {
			console.error('Problem sending a call message', error)
			// ignore
		}

		return redirect(`/calls/record/${createdCall.id}`)
	} catch (error: unknown) {
		const { getErrorMessage } = await import('#app/utils/misc.tsx')
		actionData.errors.generalError = getErrorMessage(error)
		return json(actionData, 500)
	}
}

async function publishCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const { actionData, fields } = getActionData(formData)
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) {
		actionData.errors.generalError = 'Call id is required.'
		return json(actionData, 400)
	}
	if (hasActionErrors(actionData)) {
		return json(actionData, 400)
	}

	try {
		const [
			{ createEpisodeAudio },
			{ markdownToHtml },
			{ getNonNull },
			{ prisma },
			{ sendEmail },
			{ requireAdminUser },
			{ createEpisode },
		] = await Promise.all([
			import('#app/utils/ffmpeg.server.ts'),
			import('#app/utils/markdown.server.ts'),
			import('#app/utils/misc.tsx'),
			import('#app/utils/prisma.server.ts'),
			import('#app/utils/send-email.server.ts'),
			import('#app/utils/session.server.ts'),
			import('#app/utils/transistor.server.ts'),
		])

		await requireAdminUser(request)
		const call = await prisma.call.findFirst({
			where: { id: callId },
			include: { user: true },
		})
		if (!call) {
			return redirectCallNotFound()
		}

		const {
			audio: responseAudio,
			title,
			description,
			keywords,
		} = getNonNull(fields)
		const episodeAudio = await createEpisodeAudio(call.base64, responseAudio)
		const { episodeUrl, imageUrl } = await createEpisode({
			request,
			audio: episodeAudio,
			title,
			summary: `${call.user.firstName} asked this on ${format(call.createdAt, 'yyyy-MM-dd')}`,
			description: await markdownToHtml(description),
			user: call.user,
			keywords,
		})

		if (episodeUrl) {
			try {
				void sendEmail({
					to: call.user.email,
					from: `"Kent C. Dodds" <hello+calls@kentcdodds.com>`,
					subject: `Your "Call Kent" episode has been published`,
					text: `
Hi ${call.user.firstName},

Thanks for your call. Kent just replied and the episode has been published to the podcast!

[![${title}](${imageUrl})](${episodeUrl})
          `.trim(),
				})
			} catch (error: unknown) {
				console.error(
					`Problem sending email about a call: ${episodeUrl}`,
					error,
				)
			}
		}

		await prisma.call.delete({
			where: { id: call.id },
		})

		return redirect('/calls')
	} catch (error: unknown) {
		const { getErrorMessage } = await import('#app/utils/misc.tsx')
		actionData.errors.generalError = getErrorMessage(error)
		return json(actionData, 500)
	}
}

async function deleteCall({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) {
		return redirectCallNotFound()
	}

	const [{ prisma }, { requireAdminUser }] = await Promise.all([
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/session.server.ts'),
	])
	await requireAdminUser(request)
	const call = await prisma.call.findFirst({ where: { id: callId } })
	if (!call) {
		return redirectCallNotFound()
	}
	await prisma.call.delete({ where: { id: callId } })
	return redirect('/calls/admin')
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = getStringFormValue(formData, 'intent')

	if (intent === 'create-call') {
		return createCall({ request, formData })
	}
	if (intent === 'publish-call') {
		return publishCall({ request, formData })
	}
	if (intent === 'delete-call') {
		return deleteCall({ request, formData })
	}

	return json(
		{
			fields: {},
			errors: {
				generalError: 'Unknown recording form intent.',
			},
		} satisfies ActionData,
		400,
	)
}

export type { RecordingFormData, RecordingSubmitIntent }
export { RecordingForm, recordingFormActionPath }
