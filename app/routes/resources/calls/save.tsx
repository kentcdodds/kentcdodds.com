import { format } from 'date-fns'
import * as React from 'react'
import { data as json, redirect, useNavigate, useRevalidator } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { Field } from '#app/components/form-elements.tsx'
import {
	getErrorForAudio,
	getErrorForDescription,
	getErrorForKeywords,
	getErrorForTitle,
} from '#app/utils/call-kent.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/save'

const recordingFormActionPath = '/resources/calls/save'

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

		const form = new FormData(event.currentTarget)
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

					if (response.redirected && response.url) {
						const redirectUrl = new URL(response.url, window.location.origin)
						await navigate(
							`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`,
						)
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

			<form method="post" onSubmit={handleSubmit}>
				<input type="hidden" name="intent" value={intent} />
				{callId ? <input type="hidden" name="callId" value={callId} /> : null}
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

function getActionErrorMessage(error: unknown, fallback = 'Unknown Error') {
	if (typeof error === 'string') return error
	if (error instanceof Error) return error.message
	return fallback
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
		actionData.errors.generalError = getActionErrorMessage(error)
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
		actionData.errors.generalError = getActionErrorMessage(error)
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
