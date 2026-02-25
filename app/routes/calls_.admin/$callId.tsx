import * as React from 'react'
import {
	data as json,
	redirect,
	Form,
	useLocation,
	useNavigate,
	useRevalidator,
} from 'react-router'
import { Button } from '#app/components/button.tsx'
import { CallRecorder } from '#app/components/calls/recorder.tsx'
import {
	getNavigationPathFromResponse,
	recordingFormActionPath,
} from '#app/components/calls/recording-form.tsx'
import { useInterval } from '#app/components/hooks/use-interval.tsx'
import { MailIcon } from '#app/components/icons.tsx'
import { Spinner } from '#app/components/spinner.tsx'
import { H4, H6, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { formatDate, useDoubleCheck } from '#app/utils/misc-react.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { type SerializeFrom } from '#app/utils/serialize-from.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { useRootData, useUser } from '#app/utils/use-root-data.ts'
import { type Route } from './+types/$callId'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request, params }: Route.LoaderArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	await requireAdminUser(request)

	const url = new URL(request.url)
	const error = url.searchParams.get('error')
	const shouldUseSampleAudio =
		getEnv().NODE_ENV === 'development' &&
		url.searchParams.get('sampleAudio') === '1'

	const call = await prisma.call.findFirst({
		where: { id: params.callId },
		select: {
			createdAt: true,
			notes: true,
			title: true,
			id: true,
			isAnonymous: true,
			episodeDraft: {
				select: {
					id: true,
					status: true,
					step: true,
					errorMessage: true,
					episodeAudioKey: true,
					transcript: true,
					title: true,
					description: true,
					keywords: true,
				},
			},
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
	const episodeDraft = call.episodeDraft
	const hasEpisodeAudio = Boolean(episodeDraft?.episodeAudioKey)
	const episodeAudioUrl = hasEpisodeAudio
		? `/resources/calls/draft-episode-audio?callId=${call.id}`
		: null
	return json({
		call: {
			...call,
			formattedCreatedAt: formatDate(call.createdAt),
			episodeDraft: episodeDraft
				? {
						...episodeDraft,
						// Don’t send the storage key to the client.
						episodeAudioKey: null,
						hasEpisodeAudio,
						episodeAudioUrl,
					}
				: null,
		},
		error,
		shouldUseSampleAudio,
	})
}

function CallListing({ call }: { call: SerializeFrom<typeof loader>['call'] }) {
	const [audioEl, setAudioEl] = React.useState<HTMLAudioElement | null>(null)
	const [playbackRate, setPlaybackRate] = React.useState(2)
	const dc = useDoubleCheck()
	const mailtoHref = `mailto:${call.user.email}?${new URLSearchParams({
		subject: `Re: Call Kent - ${call.title}`,
		body: `I just wanted to talk about your call on the Call Kent podcast`,
	}).toString()}`

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
							{call.isAnonymous ? (
								<span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-slate-200">
									anonymous
								</span>
							) : null}
							<span>•</span>
							<a
								href={mailtoHref}
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

			{/* Notes */}
			<div className="mb-6">
				<H6 as="h3" className="mb-2">
					Notes
				</H6>
				<Paragraph className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-600 dark:text-slate-300">
					{call.notes ?? 'No notes provided.'}
				</Paragraph>
			</div>

			{/* Audio Player */}
			<div className="rounded-lg bg-gray-200 p-4 dark:bg-gray-700">
				<H6 as="h3" className="mb-3">
					Listen to Call
				</H6>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center">
					<audio
						className="w-full flex-1"
						ref={(el) => setAudioEl(el)}
						src={`/resources/calls/call-audio?callId=${call.id}`}
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
		</section>
	)
}

type EpisodeDraft = NonNullable<
	SerializeFrom<typeof loader>['call']['episodeDraft']
>

function ResponseAudioDraftForm({
	audio,
	callId,
	callNotes,
	callTitle,
}: {
	audio: Blob
	callId: string
	callNotes: string | null
	callTitle: string
}) {
	const navigate = useNavigate()
	const location = useLocation()
	const revalidator = useRevalidator()
	const { requestInfo } = useRootData()
	const flyPrimaryInstance = requestInfo.flyPrimaryInstance
	const audioURL = React.useMemo(() => URL.createObjectURL(audio), [audio])
	const abortControllerRef = React.useRef<AbortController | null>(null)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)

	React.useEffect(() => {
		return () => {
			URL.revokeObjectURL(audioURL)
			abortControllerRef.current?.abort()
		}
	}, [audioURL])

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (isSubmitting) return
		setError(null)

		const formData = new FormData(event.currentTarget)
		const callTitleValue = String(formData.get('callTitle') ?? '')
		const notesValue = String(formData.get('notes') ?? '')

		const reader = new FileReader()
		const handleLoadEnd = async () => {
			try {
				if (typeof reader.result !== 'string') {
					setError('Unable to read recording. Please try again.')
					return
				}

				const body = new URLSearchParams()
				body.set('intent', 'create-episode-draft')
				body.set('callId', callId)
				body.set('audio', reader.result)
				body.set('callTitle', callTitleValue)
				body.set('notes', notesValue)

				const headers = new Headers({
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
				})
				if (flyPrimaryInstance) {
					headers.set('fly-force-instance-id', flyPrimaryInstance)
				}

				abortControllerRef.current?.abort()
				const abortController = new AbortController()
				abortControllerRef.current = abortController

				const response = await fetch(recordingFormActionPath, {
					method: 'POST',
					body,
					headers,
					signal: abortController.signal,
				})

				const redirectPath = getNavigationPathFromResponse(response)
				if (redirectPath) {
					// Avoid scroll-to-top when the action redirects back to this page.
					// (Also avoid unnecessary navigation if the redirect target is the same URL.)
					if (redirectPath !== `${location.pathname}${location.search}`) {
						await navigate(redirectPath, { preventScrollReset: true })
					} else {
						await revalidator.revalidate()
					}
					return
				}

				if (response.ok) {
					await revalidator.revalidate()
					return
				}

				const text = await response.text().catch(() => '')
				setError(text.trim() || 'Unable to submit response. Please try again.')
			} catch (e: unknown) {
				if (e instanceof DOMException && e.name === 'AbortError') return
				setError(e instanceof Error ? e.message : 'Unable to submit response.')
			} finally {
				setIsSubmitting(false)
			}
		}

		reader.addEventListener('loadend', handleLoadEnd, { once: true })
		setIsSubmitting(true)
		try {
			reader.readAsDataURL(audio)
		} catch (e: unknown) {
			reader.removeEventListener('loadend', handleLoadEnd)
			setIsSubmitting(false)
			setError(e instanceof Error ? e.message : 'Unable to read recording.')
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{error ? (
				<p role="alert" className="text-red-500">
					{error}
				</p>
			) : null}
			<audio src={audioURL} controls preload="metadata" className="w-full" />
			<form method="post" onSubmit={handleSubmit} noValidate>
				<div className="mb-4">
					<label
						htmlFor="call-title"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Call title
					</label>
					<input
						id="call-title"
						name="callTitle"
						defaultValue={callTitle}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						required
					/>
				</div>
				<div className="mb-4">
					<label
						htmlFor="call-notes"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Caller notes
					</label>
					<textarea
						id="call-notes"
						name="notes"
						defaultValue={callNotes ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						rows={4}
					/>
				</div>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Starting...' : 'Generate episode draft'}
				</Button>
			</form>
		</div>
	)
}

function DraftPending({
	callId,
	step,
}: {
	callId: string
	step: EpisodeDraft['step']
}) {
	const stepLabel =
		{
			STARTED: 'Starting…',
			GENERATING_AUDIO: 'Generating episode audio…',
			TRANSCRIBING: 'Transcribing audio…',
			GENERATING_METADATA: 'Writing title/description/keywords…',
			DONE: 'Finalizing…',
		}[step] ?? 'Processing…'

	return (
		<div className="rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
			<div className="flex items-center gap-3">
				<Spinner showSpinner={true} size={18} className="text-gray-500" />
				<H6 as="h3">{stepLabel}</H6>
			</div>
			<Paragraph className="mt-2 text-gray-500 dark:text-slate-400">
				{`This may take a bit. You can undo if you want to re-record right away.`}
			</Paragraph>
			<Form method="post" action={recordingFormActionPath} className="mt-6">
				<input type="hidden" name="intent" value="undo-episode-draft" />
				<input type="hidden" name="callId" value={callId} />
				<Button type="submit" variant="secondary">
					Undo and re-record
				</Button>
			</Form>
		</div>
	)
}

function DraftEditor({
	callId,
	draft,
	callNotes,
	callTitle,
}: {
	callId: string
	draft: NonNullable<SerializeFrom<typeof loader>['call']['episodeDraft']>
	callNotes: string | null
	callTitle: string
}) {
	const dc = useDoubleCheck()
	const disabled = draft.status !== 'READY'
	return (
		<div className="flex flex-col gap-6">
			{draft.hasEpisodeAudio && draft.episodeAudioUrl ? (
				<div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
					<H6 as="h3" className="mb-3">
						Episode audio preview
					</H6>
					<audio
						src={draft.episodeAudioUrl}
						controls
						preload="metadata"
						className="w-full"
					/>
				</div>
			) : null}

			<Form method="post" action={recordingFormActionPath}>
				<input type="hidden" name="callId" value={callId} />
				{/* Ensure Enter submits as "save" by default */}
				<button
					hidden
					type="submit"
					name="intent"
					value="update-episode-draft"
				/>

				<div className="mb-8">
					<label
						htmlFor="draft-call-title"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Call title
					</label>
					<input
						id="draft-call-title"
						name="callTitle"
						defaultValue={callTitle}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						required
						disabled={disabled}
					/>
				</div>

				<div className="mb-8">
					<label
						htmlFor="draft-title"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Episode title
					</label>
					<input
						id="draft-title"
						name="title"
						defaultValue={draft.title ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						required
						disabled={disabled}
					/>
				</div>

				<div className="mb-8">
					<label
						htmlFor="draft-description"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Description
					</label>
					<textarea
						id="draft-description"
						name="description"
						defaultValue={draft.description ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						rows={6}
						required
						disabled={disabled}
					/>
				</div>

				<div className="mb-8">
					<label
						htmlFor="draft-notes"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Caller notes
					</label>
					<textarea
						id="draft-notes"
						name="notes"
						defaultValue={callNotes ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						rows={4}
						disabled={disabled}
					/>
				</div>

				<div className="mb-8">
					<label
						htmlFor="draft-keywords"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Keywords (comma separated)
					</label>
					<input
						id="draft-keywords"
						name="keywords"
						defaultValue={draft.keywords ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						required
						disabled={disabled}
					/>
				</div>

				<div className="mb-8">
					<label
						htmlFor="draft-transcript"
						className="mb-2 inline-block text-lg text-gray-500 dark:text-slate-500"
					>
						Transcript
					</label>
					<textarea
						id="draft-transcript"
						name="transcript"
						defaultValue={draft.transcript ?? ''}
						className="focus-ring w-full rounded-lg bg-gray-100 px-6 py-4 text-lg font-medium text-black dark:bg-gray-800 dark:text-white"
						rows={10}
						required
						disabled={disabled}
					/>
				</div>

				<div className="flex flex-wrap gap-3">
					<Button
						type="submit"
						name="intent"
						value="update-episode-draft"
						disabled={disabled}
					>
						Save changes
					</Button>
					<Button
						type="submit"
						name="intent"
						value="publish-episode-draft"
						disabled={disabled}
						{...dc.getButtonProps()}
					>
						{dc.doubleCheck ? 'Publish (sure?)' : 'Publish episode'}
					</Button>
				</div>
			</Form>

			<Form method="post" action={recordingFormActionPath}>
				<input type="hidden" name="intent" value="undo-episode-draft" />
				<input type="hidden" name="callId" value={callId} />
				<Button type="submit" variant="secondary">
					Record new response
				</Button>
			</Form>
		</div>
	)
}

const draftStatusResourcePath = '/resources/calls/draft-status'

function RecordingDetailScreen({
	data,
}: {
	data: Route.ComponentProps['loaderData']
}) {
	const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
	const [polledStatus, setPolledStatus] = React.useState<{
		status: string
		step: string
		errorMessage: string | null
	} | null>(null)
	const user = useUser()
	const draft = data.call.episodeDraft
	const revalidator = useRevalidator()
	React.useEffect(() => {
		setPolledStatus(null)
	}, [draft?.id])

	// Use lightweight status-only endpoint when polling to avoid re-fetching
	// transcript, title, description, keywords on every 1.5s poll.
	useInterval(
		async () => {
			if (revalidator.state !== 'idle') return
			try {
				const res = await fetch(
					`${draftStatusResourcePath}?callId=${data.call.id}`,
				)
				if (!res.ok) return
				const json = (await res.json()) as {
					status: string
					step: string
					errorMessage: string | null
				}
				setPolledStatus(json)
				if (json.status !== 'PROCESSING') {
					void revalidator.revalidate()
				}
			} catch {
				// Ignore fetch errors; next poll will retry
			}
		},
		draft?.status === 'PROCESSING' ? 1500 : 0,
	)

	return (
		<div key={data.call.id} className="flex flex-col gap-6">
			{data.error ? (
				<p role="alert" className="rounded-lg bg-red-100 p-4 text-red-700">
					{data.error}
				</p>
			) : null}
			<CallListing call={data.call} />

			{/* Response Recording Section */}
			<div className="rounded-lg border-2 border-dashed border-gray-300 p-6 lg:p-8 dark:border-gray-600">
				<H6 as="h3" className="mb-4">
					Episode draft
				</H6>
				<Paragraph className="mb-6 text-gray-500 dark:text-slate-400">
					{`Record your response, then the app will generate the full episode audio, transcript, and AI metadata before you publish.`}
				</Paragraph>

				{draft ? (
					(draft.status === 'PROCESSING' && polledStatus?.status !== 'ERROR') ||
					(polledStatus?.status === 'READY' && draft.status !== 'READY') ? (
						<DraftPending
							callId={data.call.id}
							step={
								(polledStatus?.status === 'READY'
									? 'DONE'
									: (polledStatus?.step ?? draft.step)) as EpisodeDraft['step']
							}
						/>
					) : draft.status === 'ERROR' || polledStatus?.status === 'ERROR' ? (
						<div className="rounded-lg bg-red-50 p-6 dark:bg-red-950/30">
							<H6 as="h3" className="mb-2">
								{`Draft generation failed`}
							</H6>
							<Paragraph className="whitespace-pre-wrap text-red-700 dark:text-red-300">
								{polledStatus?.errorMessage ??
									draft.errorMessage ??
									'Unknown error'}
							</Paragraph>
							<Form
								method="post"
								action={recordingFormActionPath}
								className="mt-6"
							>
								<input type="hidden" name="intent" value="undo-episode-draft" />
								<input type="hidden" name="callId" value={data.call.id} />
								<Button type="submit" variant="secondary">
									Undo and re-record
								</Button>
							</Form>
						</div>
					) : (
						<DraftEditor
							callId={data.call.id}
							draft={draft}
							callNotes={data.call.notes}
							callTitle={data.call.title}
						/>
					)
				) : responseAudio ? (
					<ResponseAudioDraftForm
						audio={responseAudio}
						callId={data.call.id}
						callNotes={data.call.notes}
						callTitle={data.call.title}
					/>
				) : (
					<div className="flex flex-col gap-6">
						{data.shouldUseSampleAudio ? (
							<div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
								<Paragraph className="mb-4 text-sm text-gray-500 dark:text-slate-400">
									{`Dev-only: use the caller's audio as a sample response (helpful in cloud VMs without microphones).`}
								</Paragraph>
								<Button
									type="button"
									variant="secondary"
									onClick={() => {
										void (async () => {
											const res = await fetch(
												`/resources/calls/call-audio?callId=${data.call.id}`,
											)
											if (!res.ok) return
											const mime =
												res.headers.get('Content-Type') ?? 'audio/mpeg'
											const bytes = await res.arrayBuffer()
											setResponseAudio(new Blob([bytes], { type: mime }))
										})()
									}}
								>
									Use sample response audio
								</Button>
							</div>
						) : null}
						<CallRecorder
							onRecordingComplete={(recording) => setResponseAudio(recording)}
							team={user.team}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export default function RecordDetailScreenContainer({
	loaderData: data,
}: Route.ComponentProps) {
	return <RecordingDetailScreen data={data} key={data.call.id} />
}
