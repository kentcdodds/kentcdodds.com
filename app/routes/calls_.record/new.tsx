import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, LinkButton } from '#app/components/button.tsx'
import { CallRecorder } from '#app/components/calls/recorder.tsx'
import { Grid } from '#app/components/grid.tsx'
import { Grimmacing } from '#app/components/kifs.tsx'
import { H4, Paragraph } from '#app/components/typography.tsx'
import { RecordingForm, type RecordingFormData } from '#app/routes/resources/calls/save.tsx'
import { CallKentTextToSpeech } from '#app/routes/resources/calls/text-to-speech.tsx'
import { type KCDHandle } from '#app/types.ts'
import { useCapturedRouteError } from '#app/utils/misc-react.tsx'
import { useRootData } from '#app/utils/use-root-data.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export default function RecordScreen() {
	const [audio, setAudio] = React.useState<Blob | null>(null)
	const [prefill, setPrefill] = React.useState<RecordingFormData | undefined>(
		undefined,
	)
	const [mode, setMode] = React.useState<'record' | 'text'>('record')
	const [searchParams] = useSearchParams()
	const { user, userInfo } = useRootData()
	// should be impossible...
	if (!user || !userInfo) throw new Error('user and userInfo required')

	const shouldUseSampleAudio =
		process.env.NODE_ENV === 'development' &&
		searchParams.get('sampleAudio') === '1'

	React.useEffect(() => {
		if (!shouldUseSampleAudio) return
		if (audio) return
		// Dev-only escape hatch for environments without a microphone
		// (for example: cloud agents / CI / headless VMs).
		setAudio(new Blob(['audio'], { type: 'audio/wav' }))
	}, [shouldUseSampleAudio, audio])

	return (
		<div>
			{audio ? (
				<div className="flex flex-col gap-6">
					{shouldUseSampleAudio ? (
						<Paragraph className="mb-2">
							{`Using a sample recording (dev only)...`}
						</Paragraph>
					) : null}
					<div className="flex flex-wrap gap-3">
						<Button
							type="button"
							variant="secondary"
							size="medium"
							onClick={() => {
								setAudio(null)
								setPrefill(undefined)
								setMode('record')
							}}
						>
							Start over
						</Button>
					</div>
					<RecordingForm audio={audio} intent="create-call" data={prefill} />
				</div>
			) : (
				<div className="flex flex-col gap-8">
					{shouldUseSampleAudio ? (
						<Paragraph className="mb-4">
							{`Using a sample recording (dev only)...`}
						</Paragraph>
					) : null}
					{userInfo.avatar.hasGravatar ? null : (
						<Paragraph>
							{`
                I noticed that your avatar is generic. If you want your episode art
                to be a photo of you, set your avatar on `}
							<a
								href="https://gravatar.com"
								target="_blank"
								rel="noreferrer noopener"
							>
								Gravatar
							</a>
							{'.'}
						</Paragraph>
					)}

					{mode === 'record' ? (
						<div>
							<Paragraph className="mb-4">
								{`
                Choose which recording device you would like to use.
                Then click "Start Recording," introduce yourself
                ("Hi, Kent, my name is ${user.firstName}") and say whatever you'd like.
                Try to keep it 2 minutes or less. Thanks!
              `}
							</Paragraph>
							{shouldUseSampleAudio ? null : (
								<CallRecorder
									onRecordingComplete={(recording) => setAudio(recording)}
									team={user.team}
								/>
							)}
							<Paragraph className="mt-6 text-sm text-gray-500 dark:text-slate-400">
								{`Prefer not to record? `}
								<LinkButton
									type="button"
									underlined
									onClick={() => setMode('text')}
								>
									Type your question instead
								</LinkButton>
								{'.'}
							</Paragraph>
						</div>
					) : (
						<div>
							<Paragraph className="mb-6 text-sm text-gray-500 dark:text-slate-400">
								{`Prefer to record your own voice? `}
								<LinkButton
									type="button"
									underlined
									onClick={() => setMode('record')}
								>
									Record instead
								</LinkButton>
								{'.'}
							</Paragraph>
							<CallKentTextToSpeech
								onAcceptAudio={({ audio, questionText, suggestedTitle }) => {
									setAudio(audio)
									setPrefill({
										fields: {
											title: suggestedTitle || 'Call Kent question',
											description: questionText,
											keywords: '',
										},
										errors: {},
									})
								}}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
export function ErrorBoundary() {
	const error = useCapturedRouteError()
	console.error(error)
	return (
		<div>
			<Grid nested>
				<div className="col-span-6">
					<H4 as="p">{`Yikes... Something went wrong. Sorry about that.`}</H4>
					<H4 as="p" variant="secondary" className="mt-3">
						{`Want to `}
						<Link to=".">try again?</Link>
					</H4>
				</div>
				<Grimmacing
					className="col-span-5 col-start-7 rounded-lg"
					aspectRatio="3:4"
				/>
			</Grid>
		</div>
	)
}
