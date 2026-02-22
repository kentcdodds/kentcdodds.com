import { format } from 'date-fns'
import * as React from 'react'
import {
	data as json,
	redirect,
	useNavigate,
	useRevalidator,
} from 'react-router'
import { Button } from '#app/components/button.tsx'
import { EpisodeArtworkPreview } from '#app/components/calls/episode-artwork-preview.tsx'
import { CharacterCountdown } from '#app/components/character-countdown.tsx'
import { Field } from '#app/components/form-elements.tsx'
import {
	callKentFieldConstraints,
	getErrorForAudio,
	getErrorForTitle,
	getErrorForNotes,
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
		notes?: string | null
	}
	errors: {
		generalError?: string
		audio?: string | null
		title?: string | null
		notes?: string | null
	}
}

type ActionData = RecordingFormData
type RecordingIntent = 'create-call' | 'delete-call'
type RecordingSubmitIntent = Exclude<RecordingIntent, 'delete-call'>
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

function getStringFormValue(formData: FormData, key: string) {
	const value = formData.get(key)
	return typeof value === 'string' ? value : null
}

function getCheckboxFormValue(formData: FormData, key: string) {
	const value = formData.get(key)
	// HTML checkboxes submit the value only when checked (default "on").
	return value === 'on' || value === 'true'
}

function getActionData(formData: FormData) {
	const fields = {
		audio: getStringFormValue(formData, 'audio'),
		title: getStringFormValue(formData, 'title'),
		notes: getStringFormValue(formData, 'notes'),
	}

	const actionData: ActionData = {
		fields: {
			title: fields.title,
			notes: fields.notes,
		},
		errors: {
			audio: getErrorForAudio(fields.audio),
			title: getErrorForTitle(fields.title),
			notes: getErrorForNotes(fields.notes),
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

	const isAnonymous = getCheckboxFormValue(formData, 'anonymous')

	try {
		const [
			{ sendMessageFromDiscordBot },
			{ getDomainUrl, getOptionalTeam },
			{ getEnv },
			{ prisma },
			{ requireUser },
			{ teamEmoji },
		] = await Promise.all([
			import('#app/utils/discord.server.ts'),
			import('#app/utils/misc.ts'),
			import('#app/utils/env.server.ts'),
			import('#app/utils/prisma.server.ts'),
			import('#app/utils/session.server.ts'),
			import('#app/utils/team-provider.tsx'),
		])

		const user = await requireUser(request)
		const domainUrl = getDomainUrl(request)
		const { audio, title, notes } = fields
		if (!audio || !title) {
			return json(actionData, 400)
		}

		const createdCall = await prisma.call.create({
			data: {
				title,
				notes: notes?.trim() || null,
				userId: user.id,
				base64: audio,
				isAnonymous,
			},
		})

		try {
			const env = getEnv()
			const channelId = env.DISCORD_PRIVATE_BOT_CHANNEL
			const adminUserId = env.DISCORD_ADMIN_USER_ID
			const { firstName, team, discordId } = user
			const userMention = discordId ? `<@!${discordId}>` : firstName
			const emoji = teamEmoji[getOptionalTeam(team)]
			const notesBlock = notes?.trim()
				? `\n\nNotes:\n${notes.trim()}`
				: ''
			const message = `📳 <@!${adminUserId}> ring ring! New call from ${userMention} ${emoji}: "${title}"${isAnonymous ? ' (anonymous)' : ''}${notesBlock}\n\n${domainUrl}/calls/admin/${createdCall.id}`
			void sendMessageFromDiscordBot(channelId, message)
		} catch (error: unknown) {
			console.error('Problem sending a call message', error)
			// ignore
		}

		return redirect(`/calls/record/${createdCall.id}`)
	} catch (error: unknown) {
		const { getErrorMessage } = await import('#app/utils/misc.ts')
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
	try {
		const [
			{ markdownToHtml },
			{ prisma },
			{ sendEmail },
			{ requireAdminUser },
			{ createEpisode },
		] = await Promise.all([
			import('#app/utils/markdown.server.ts'),
			import('#app/utils/prisma.server.ts'),
			import('#app/utils/send-email.server.ts'),
			import('#app/utils/session.server.ts'),
			import('#app/utils/transistor.server.ts'),
		])

		await requireAdminUser(request)
		const callId = getStringFormValue(formData, 'callId')
		if (!callId) return redirectCallNotFound()

		const call = await prisma.call.findFirst({
			where: { id: callId },
			include: { user: true, episodeDraft: true },
		})
		if (!call) {
			return redirectCallNotFound()
		}

		const draft = call.episodeDraft
		if (!draft || draft.status !== 'READY') {
			const searchParams = new URLSearchParams()
			searchParams.set('error', 'Draft episode is not ready to publish yet.')
			return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
		}

		// Allow publishing directly from an edit form without requiring a separate
		// "Save" click first.
		const formTitle = getStringFormValue(formData, 'title')
		const formDescription = getStringFormValue(formData, 'description')
		const formKeywords = getStringFormValue(formData, 'keywords')
		const formTranscript = getStringFormValue(formData, 'transcript')
		const shouldUpdateFromForm =
			formTitle !== null ||
			formDescription !== null ||
			formKeywords !== null ||
			formTranscript !== null

		if (shouldUpdateFromForm) {
			await prisma.callKentEpisodeDraft.update({
				where: { callId },
				data: {
					title: formTitle?.trim() || null,
					description: formDescription?.trim() || null,
					keywords: formKeywords?.trim() || null,
					transcript: formTranscript?.trim() || null,
				},
			})
		}

		const title = (formTitle ?? draft.title ?? '').trim()
		const description = (formDescription ?? draft.description ?? '').trim()
		const keywords = (formKeywords ?? draft.keywords ?? '').trim()
		const transcriptText = (formTranscript ?? draft.transcript ?? '').trim()
		const episodeBase64 = draft.episodeBase64

		if (!title || !description || !keywords || !transcriptText || !episodeBase64) {
			const searchParams = new URLSearchParams()
			searchParams.set(
				'error',
				'Draft is missing required fields (audio/transcript/title/description/keywords).',
			)
			return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
		}

		const episodeAudio = Buffer.from(episodeBase64.split(',')[1]!, 'base64')
		const summaryName = call.isAnonymous ? 'Anonymous' : call.user.firstName
		const published = await createEpisode({
			request,
			audio: episodeAudio,
			title,
			summary: `${summaryName} asked this on ${format(call.createdAt, 'yyyy-MM-dd')}`,
			description: await markdownToHtml(description),
			user: call.user,
			keywords,
			isAnonymous: call.isAnonymous,
			transcriptText,
		})

		if (published.episodeUrl) {
			try {
				void sendEmail({
					to: call.user.email,
					from: `"Kent C. Dodds" <hello+calls@kentcdodds.com>`,
					subject: `Your "Call Kent" episode has been published`,
					text: `
Hi ${call.user.firstName},

Thanks for your call. Kent just replied and the episode has been published to the podcast!

[![${title}](${published.imageUrl ?? ''})](${published.episodeUrl})
          `.trim(),
				})
			} catch (error: unknown) {
				console.error(
					`Problem sending email about a call: ${published.episodeUrl}`,
					error,
				)
			}
		}

		// Persist a per-caller record so users can see their episodes on /me even
		// after the raw call record is removed.
		await prisma.callKentCallerEpisode.create({
			data: {
				userId: call.userId,
				callTitle: call.title,
				callNotes: call.notes,
				isAnonymous: call.isAnonymous,
				transistorEpisodeId: published.transistorEpisodeId,
			},
		})

		await prisma.call.delete({
			where: { id: call.id },
		})

		return redirect('/calls')
	} catch (error: unknown) {
		const { getErrorMessage } = await import('#app/utils/misc.ts')
		const callId = getStringFormValue(formData, 'callId')
		const searchParams = new URLSearchParams()
		searchParams.set('error', getErrorMessage(error))
		return redirect(
			callId ? `/calls/admin/${callId}?${searchParams.toString()}` : '/calls/admin',
		)
	}
}

async function createEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	const responseAudio = getStringFormValue(formData, 'audio')
	if (!callId) return redirectCallNotFound()
	if (getErrorForAudio(responseAudio)) {
		const searchParams = new URLSearchParams()
		searchParams.set('error', 'Response audio file is required.')
		return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
	}

	const [{ prisma }, { requireAdminUser }] = await Promise.all([
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/session.server.ts'),
	])
	await requireAdminUser(request)

	const call = await prisma.call.findFirst({ where: { id: callId } })
	if (!call) return redirectCallNotFound()

	// Replace any existing draft so "re-record response" is safe and predictable.
	await prisma.callKentEpisodeDraft.deleteMany({ where: { callId } })
	const draft = await prisma.callKentEpisodeDraft.create({
		data: {
			callId,
		},
	})

	const { startCallKentEpisodeDraftProcessing } = await import(
		'#app/utils/call-kent-episode-draft.server.ts'
	)
	void startCallKentEpisodeDraftProcessing(draft.id, {
		responseBase64: responseAudio!,
	})

	return redirect(`/calls/admin/${callId}`)
}

async function undoEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) return redirectCallNotFound()

	const [{ prisma }, { requireAdminUser }] = await Promise.all([
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/session.server.ts'),
	])
	await requireAdminUser(request)
	await prisma.callKentEpisodeDraft.deleteMany({ where: { callId } })
	return redirect(`/calls/admin/${callId}`)
}

async function updateEpisodeDraft({
	request,
	formData,
}: {
	request: Request
	formData: FormData
}) {
	const callId = getStringFormValue(formData, 'callId')
	if (!callId) return redirectCallNotFound()

	const title = getStringFormValue(formData, 'title')
	const description = getStringFormValue(formData, 'description')
	const keywords = getStringFormValue(formData, 'keywords')
	const transcript = getStringFormValue(formData, 'transcript')

	const [{ prisma }, { requireAdminUser }] = await Promise.all([
		import('#app/utils/prisma.server.ts'),
		import('#app/utils/session.server.ts'),
	])
	await requireAdminUser(request)

	try {
		await prisma.callKentEpisodeDraft.update({
			where: { callId },
			data: {
				title: title?.trim() || null,
				description: description?.trim() || null,
				keywords: keywords?.trim() || null,
				transcript: transcript?.trim() || null,
			},
		})
		return redirect(`/calls/admin/${callId}`)
	} catch (error: unknown) {
		const { getErrorMessage } = await import('#app/utils/misc.ts')
		const searchParams = new URLSearchParams()
		searchParams.set('error', getErrorMessage(error))
		return redirect(`/calls/admin/${callId}?${searchParams.toString()}`)
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
	if (intent === 'create-episode-draft') return createEpisodeDraft({ request, formData })
	if (intent === 'undo-episode-draft') return undoEpisodeDraft({ request, formData })
	if (intent === 'update-episode-draft') return updateEpisodeDraft({ request, formData })
	if (intent === 'publish-episode-draft') return publishCall({ request, formData })
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
