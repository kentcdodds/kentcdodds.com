import { type ActionFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { CloudinaryVideo } from '~/components/cloudinary-video'
import { Grid } from '~/components/grid.tsx'
import { HeroSection } from '~/components/sections/hero-section.tsx'
import { Spacer } from '~/components/spacer.tsx'
import { Paragraph } from '~/components/typography.tsx'
import { handleConvertKitFormSubmission } from '~/convertkit/remix.server.ts'

export const action: ActionFunction = async ({ request }) => {
	return handleConvertKitFormSubmission(request)
}

export default function ConvertKit() {
	return (
		<>
			<HeroSection
				title="Huzzah!"
				subtitle="You've signed up"
				image={
					<CloudinaryVideo
						cloudinaryId="kentcdodds.com/misc/approve"
						className="rounded-lg"
						aspectRatio="3:4"
					/>
				}
			/>

			<Grid as="main" className="mb-48">
				<div className="col-span-full">
					<Paragraph>{`... Ummm... Also, please enable JavaScript 😅`}</Paragraph>
					<Spacer size="3xs" />
					<Link to="/" className="underlined">
						Go to the home page
					</Link>
				</div>
			</Grid>
		</>
	)
}
