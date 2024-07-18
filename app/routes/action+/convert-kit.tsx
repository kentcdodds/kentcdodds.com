import { type ActionFunctionArgs } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { CloudinaryVideo } from '#app/components/cloudinary-video'
import { Grid } from '#app/components/grid.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { handleConvertKitFormSubmission } from '#app/convertkit/remix.server.ts'

export async function action({ request }: ActionFunctionArgs) {
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
