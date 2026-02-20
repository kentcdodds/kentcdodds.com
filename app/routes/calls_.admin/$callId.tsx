import * as React from 'react'
import { data as json, redirect, Form, useLoaderData } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { CallRecorder } from '#app/components/calls/recorder.tsx'
import {
	RecordingForm,
	recordingFormActionPath,
} from '#app/routes/resources/calls/save.tsx'
import { MailIcon } from '#app/components/icons.tsx'
import { H4, H6, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { formatDate, useDoubleCheck } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { type SerializeFrom } from '#app/utils/serialize-from.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { useUser } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/$callId'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request, params }: Route.LoaderArgs) {
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
			className={`set-color-team-current-${call.user.team.toLowerCase()} rounded-lg bg-gray-100 p-6 lg:p-8 dark:bg-gray-800`}
		>
			{/* Header */}
			<div className="mb-6 border-b border-gray-200 pb-6 dark:border-gray-700">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<H4 as="h2" className="mb-2">
							{call.title}
						</H4>
						<div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
							<span className="text-team-current font-medium">
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
					<Form method="post" action={recordingFormActionPath}>
						<input type="hidden" name="intent" value="delete-call" />
						<input type="hidden" name="callId" value={call.id} />
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
				<Paragraph className="whitespace-pre-wrap text-gray-600 dark:text-slate-300">
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
								className="text-sm whitespace-nowrap text-gray-500 dark:text-slate-400"
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
							<span className="w-10 text-sm font-medium text-gray-700 dark:text-slate-300">
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
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	const user = useUser()

	return (
		<div key={data.call.id} className="flex flex-col gap-6">
			<CallListing call={data.call} />

			{/* Response Recording Section */}
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-6 lg:p-8 dark:border-gray-600">
				<H6 as="h3" className="mb-4">
					Record Your Response
				</H6>
				<Paragraph className="mb-6 text-gray-500 dark:text-slate-400">
					Record your response to this call. Once submitted, the response will
					be stitched together with the original call and published to the
					podcast.
				</Paragraph>

				{responseAudio ? (
					<RecordingForm
						audio={responseAudio}
						intent="publish-call"
						callId={data.call.id}
						data={{
							fields: {
								title: data.call.title,
								description: data.call.description,
								keywords: data.call.keywords,
							},
							errors: {},
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
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	return <RecordingDetailScreen key={data.call.id} />
}
