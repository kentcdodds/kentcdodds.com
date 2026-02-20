import * as React from 'react'
import { Link } from 'react-router'
import { CallRecorder } from '#app/components/calls/recorder.tsx'
import { Grid } from '#app/components/grid.tsx'
import { Grimmacing } from '#app/components/kifs.tsx'
import { H4, Paragraph } from '#app/components/typography.tsx'
import { RecordingForm } from '#app/routes/resources/calls/save.tsx'
import { type KCDHandle } from '#app/types.ts'
import { useCapturedRouteError } from '#app/utils/misc.tsx'
import { useRootData } from '#app/utils/use-root-data.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export default function RecordScreen() {
	const [audio, setAudio] = React.useState<Blob | null>(null)
	const { user, userInfo } = useRootData()
	// should be impossible...
	if (!user || !userInfo) throw new Error('user and userInfo required')
	return (
		<div>
			{audio ? (
				<RecordingForm audio={audio} intent="create-call" />
			) : (
				<div>
					<Paragraph className="mb-4">
						{`
              Choose which recording device you would like to use.
              Then click "Start Recording," introduce yourself
              ("Hi, Kent, my name is ${user.firstName}") and say whatever you'd like.
              Try to keep it 2 minutes or less. Thanks!
            `}
					</Paragraph>
					{userInfo.avatar.hasGravatar ? null : (
						<Paragraph className="mb-4">
							{`
                Oh, and I noticed that your avatar is generic. If you want your
                episode art to be a photo of you, then you'll want to set your
                avatar to a photo of you
              `}
							<a
								href="https://gravatar.com"
								target="_blank"
								rel="noreferrer noopener"
							>
								on Gravatar
							</a>
							{'.'}
						</Paragraph>
					)}
					<CallRecorder
						onRecordingComplete={(recording) => setAudio(recording)}
						team={user.team}
					/>
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
