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
import { MailIcon } from '#app/components/icons.tsx'
import { H4, H6, Paragraph } from '#app/components/typography.tsx'
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
			className={`set-color-team-current-${call.user.team.toLowerCase()} rounded-lg bg-gray-100 p-6 dark:bg-gray-800 lg:p-8`}
		>
			{/* Header */}
			<div className="mb-6 border-b border-gray-200 pb-6 dark:border-gray-700">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<H4 as="h2" className="mb-2">
							{call.title}
						</H4>
						<div className="dark:text-slate-400 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							<span className="font-medium text-team-current">
								{call.user.firstName}
							</span>
							<span>•</span>
							<a
								href={`mailto:${call.user.email}`}
								className="inline-flex items-center gap-1 hover:underline"
							>
								<MailIcon size={14} />
								{call.user.email}
							</a>
							<span>•</span>
							<span>{call.formattedCreatedAt}</span>
						</div>
					</div>
					<Form method="delete">
						<Button
							type="submit"
							variant="danger"
							size="small"
							{...dc.getButtonProps()}
						>
							{dc.doubleCheck ? 'You sure?' : 'Delete'}
						</Button>
					</Form>
				</div>
			</div>

			{/* Description */}
			<div className="mb-6">
				<H6 as="h3" className="mb-2">
					Description
				</H6>
				<Paragraph className="dark:text-slate-300 whitespace-pre-wrap text-gray-600">
					{call.description}
				</Paragraph>
			</div>

			{/* Audio Player */}
			{audioURL ? (
				<div className="rounded-lg bg-gray-200 p-4 dark:bg-gray-700">
					<H6 as="h3" className="mb-3">
						Listen to Call
					</H6>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
						<audio
							className="w-full flex-1"
							ref={(el) => setAudioEl(el)}
							src={audioURL}
							controls
							preload="metadata"
						/>
						<div className="flex items-center gap-2 lg:w-auto">
							<label
								htmlFor="playbackRate"
								className="dark:text-slate-400 whitespace-nowrap text-sm text-gray-500"
							>
								Speed:
							</label>
							<input
								id="playbackRate"
								type="range"
								min="0.5"
								max="3"
								step="0.1"
								value={playbackRate}
								onChange={(e) => setPlaybackRate(Number(e.target.value))}
								className="w-20"
							/>
							<span className="dark:text-slate-300 w-10 text-sm font-medium text-gray-700">
								{playbackRate}x
							</span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	)
}

function RecordingDetailScreen() {
	const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const user = useUser()

	return (
		<div key={data.call.id} className="flex flex-col gap-6">
			<CallListing call={data.call} />

			{/* Response Recording Section */}
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-6 dark:border-gray-600 lg:p-8">
				<H6 as="h3" className="mb-4">
					Record Your Response
				</H6>
				<Paragraph className="dark:text-slate-400 mb-6 text-gray-500">
					Record your response to this call. Once submitted, the response will
					be stitched together with the original call and published to the
					podcast.
				</Paragraph>

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
		</div>
	)
}

export default function RecordDetailScreenContainer() {
	const data = useLoaderData<typeof loader>()
	return <RecordingDetailScreen key={data.call.id} />
}
