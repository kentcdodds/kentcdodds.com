import {
	type ActionFunctionArgs,
	json,
	redirect,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { type LoaderFunctionArgs } from '@remix-run/router'
import { format } from 'date-fns'
import * as React from 'react'
import { Button } from '#app/components/button.tsx'
import { CallRecorder } from '#app/components/calls/recorder.tsx'
import {
	RecordingForm,
	type RecordingFormData,
} from '#app/components/calls/submit-recording-form.tsx'
import { Field } from '#app/components/form-elements.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import {
	getErrorForAudio,
	getErrorForDescription,
	getErrorForKeywords,
	getErrorForTitle,
} from '#app/utils/call-kent.ts'
import { createEpisodeAudio } from '#app/utils/ffmpeg.server.ts'
import { markdownToHtml } from '#app/utils/markdown.server.ts'
import {
	formatDate,
	getErrorMessage,
	getNonNull,
	useDoubleCheck,
} from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendEmail } from '#app/utils/send-email.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { createEpisode } from '#app/utils/transistor.server.ts'
import { useUser } from '#app/utils/use-root-data.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type ActionData = RecordingFormData

export async function action({ request, params }: ActionFunctionArgs) {
	await requireAdminUser(request)

	if (request.method === 'DELETE') {
		await prisma.call.delete({ where: { id: params.callId } })
		return redirect('/calls/admin')
	}
	const call = await prisma.call.findFirst({
		where: { id: params.callId },
		include: { user: true },
	})
	if (!call) {
		const searchParams = new URLSearchParams()
		searchParams.set('message', 'Call not found')
		return redirect(`/calls/admin?${searchParams.toString()}`)
	}
	const actionData: ActionData = { fields: {}, errors: {} }
	try {
		const requestText = await request.text()
		const form = new URLSearchParams(requestText)

		const formData = {
			audio: form.get('audio'),
			title: form.get('title'),
			description: form.get('description'),
			keywords: form.get('keywords'),
		}
		actionData.fields = {
			title: formData.title,
			description: formData.description,
			keywords: formData.keywords,
		}

		actionData.errors = {
			audio: getErrorForAudio(formData.audio),
			title: getErrorForTitle(formData.title),
			description: getErrorForDescription(formData.description),
			keywords: getErrorForKeywords(formData.keywords),
		}

		if (Object.values(actionData.errors).some((err) => err !== null)) {
			return json(actionData, 400)
		}

		const {
			audio: response,
			title,
			description,
			keywords,
		} = getNonNull(formData)

		const episodeAudio = await createEpisodeAudio(call.base64, response)

		const { episodeUrl, imageUrl } = await createEpisode({
			request,
			audio: episodeAudio,
			title,
			summary: `${call.user.firstName} asked this on ${format(
				call.createdAt,
				'yyyy-MM-dd',
			)}`,
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
		actionData.errors.generalError = getErrorMessage(error)
		return json(actionData, 500)
	}
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	await requireAdminUser(request)

	const call = await prisma.call.findFirst({
		where: { id: params.callId },
		select: {
			createdAt: true,
			base64: true,
			description: true,
			keywords: true,
			title: true,
			id: true,
			user: {
				select: { firstName: true, email: true, team: true, discordId: true },
			},
		},
	})
	if (!call) {
		console.error(`No call found at ${params.callId}`)
		const searchParams = new URLSearchParams()
		searchParams.set('message', 'Call not found')
		return redirect(`/calls/admin?${searchParams.toString()}`)
	}
	return json({
		call: { ...call, formattedCreatedAt: formatDate(call.createdAt) },
	})
}

function CallListing({ call }: { call: SerializeFrom<typeof loader>['call'] }) {
	const [audioURL, setAudioURL] = React.useState<string | null>(null)
	const [audioEl, setAudioEl] = React.useState<HTMLAudioElement | null>(null)
	const [playbackRate, setPlaybackRate] = React.useState(2)
	const dc = useDoubleCheck()
	React.useEffect(() => {
		const audio = new Audio(call.base64)
		setAudioURL(audio.src)
	}, [call.base64])

	React.useEffect(() => {
		if (!audioEl) return
		audioEl.playbackRate = playbackRate
	}, [audioEl, playbackRate])

	return (
		<section
			className={`set-color-team-current-${call.user.team.toLowerCase()}`}
		>
			<strong className="text-team-current">{call.user.firstName}</strong> (
			<a href={`mailto:${call.user.email}`}>{call.user.email}</a>) asked on{' '}
			{call.formattedCreatedAt}
			<br />
			<strong>{call.title}</strong>
			<Paragraph>{call.description}</Paragraph>
			{audioURL ? (
				<div className="my-6 flex flex-wrap items-center gap-6">
					<audio
						className="flex-1"
						style={{ minWidth: '300px' }}
						ref={(el) => setAudioEl(el)}
						src={audioURL}
						controls
						preload="metadata"
					/>
					<Field
						value={playbackRate}
						onChange={(e) => setPlaybackRate(Number(e.target.value))}
						label="Playback rate"
						name="playbackRate"
						type="number"
						max="3"
						min="0.5"
						step="0.1"
					/>
				</div>
			) : null}
			<Form method="delete">
				<input type="hidden" name="callId" value={call.id} />
				<Button type="submit" variant="danger" {...dc.getButtonProps()}>
					{dc.doubleCheck ? 'You sure?' : 'Delete'}
				</Button>
			</Form>
		</section>
	)
}

function RecordingDetailScreen() {
	const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const user = useUser()

	return (
		<div key={data.call.id}>
			<CallListing call={data.call} />
			<Spacer size="xs" />
			<strong>Record your response:</strong>
			<Spacer size="2xs" />
			{responseAudio ? (
				<RecordingForm
					audio={responseAudio}
					data={{
						fields: { ...data.call, ...actionData?.fields },
						errors: { ...actionData?.errors },
					}}
				/>
			) : (
				<CallRecorder
					onRecordingComplete={(recording) => setResponseAudio(recording)}
					team={user.team}
				/>
			)}
		</div>
	)
}

export default function RecordDetailScreenContainer() {
	const data = useLoaderData<typeof loader>()
	return <RecordingDetailScreen key={data.call.id} />
}
