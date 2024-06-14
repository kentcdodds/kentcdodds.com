import { json, type LoaderFunction, type MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ButtonLink } from '~/components/button.tsx'
import { Grid } from '~/components/grid.tsx'
import { MailIcon } from '~/components/icons.tsx'
import { BlogSection } from '~/components/sections/blog-section.tsx'
import { HeroSection } from '~/components/sections/hero-section.tsx'
import { H2, H3, H6, Paragraph } from '~/components/typography.tsx'
import { ConvertKitForm } from '~/convertkit/form.tsx'
import { getGenericSocialImage, getImgProps, images } from '~/images.tsx'
import { type RootLoaderType } from '~/root.tsx'
import { type Await } from '~/types.ts'
import { getBlogRecommendations } from '~/utils/blog.server.ts'
import { getDisplayUrl, getUrl } from '~/utils/misc.tsx'
import { getSocialMetas } from '~/utils/seo.ts'
import { getServerTimeHeader } from '~/utils/timing.server.ts'
import { useRootData } from '~/utils/use-root-data.ts'

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: `Subscribe to the KCD Mailing List`,
		description: `Get weekly insights, ideas, and proven coding practices from the KCD Mailing List`,
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			url: getDisplayUrl(requestInfo),
			featuredImage: images.snowboard(),
			words: `Subscribe to the KCD Mailing List`,
		}),
	})
}

type LoaderData = {
	blogRecommendations: Await<ReturnType<typeof getBlogRecommendations>>
}

export const loader: LoaderFunction = async ({ request }) => {
	const timings = {}
	const blogRecommendations = await getBlogRecommendations({ request, timings })
	const data: LoaderData = { blogRecommendations }

	return json(data, {
		headers: {
			'Cache-Control': 'private, max-age=3600',
			Vary: 'Cookie',
			'Server-Timing': getServerTimeHeader(timings),
		},
	})
}

export default function SubscribeScreen() {
	const data = useLoaderData<LoaderData>()
	const { userInfo } = useRootData()
	const subscribedToNewsletter = userInfo?.convertKit?.tags.some(
		({ name }) => name === 'Subscribed: general newsletter',
	)
	return (
		<>
			<HeroSection
				title="Increase your knowledge"
				subtitle="With valuable insights emailed to you each week"
				imageBuilder={images.snowboard}
				arrowUrl="#why"
				arrowLabel="Why should I?"
				action={
					<ButtonLink variant="primary" href="#subscribe-form">
						<MailIcon /> Subscribe
					</ButtonLink>
				}
			/>
			<main>
				<Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-6 lg:col-start-1">
						<div className="mb-12 aspect-[4/3] lg:mb-0">
							<img
								{...getImgProps(images.kentCodingWithSkates, {
									className: 'rounded-lg object-cover',
									widths: [410, 650, 820, 1230, 1640, 2460],
									sizes: [
										'(max-width: 1023px) 80vw',
										'(min-width:1024px) and (max-width:1620px) 40vw',
										'630px',
									],
									transformations: {
										resize: {
											type: 'fill',
											aspectRatio: '3:4',
										},
									},
								})}
							/>
						</div>
					</div>

					<div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
						<H2 id="why" className="mb-10">
							{`Here's what you get out of subscribing.`}
						</H2>

						<ButtonLink
							className="mb-32"
							variant="primary"
							href="#subscribe-form"
						>
							<MailIcon /> Subscribe
						</ButtonLink>

						<H6 as="h3" className="mb-4">
							{`Stay sharp`}
						</H6>
						<Paragraph className="mb-12">
							{`
                Keeping yourself up-to-date is critical in this ever-changing
                fast-paced industry. One of the things that has helped me to
                keep myself sharp the most is to
              `}
							<strong>systemize regular exposure to ideas.</strong>
							{`
                When you give me your email, you're signing up to receive
                this kind of exposure every week. You'll read about the problems
                and solutions that I've experienced so you know what to reach
                for when you face similar problems in the future.
              `}
						</Paragraph>
						<H6 as="h3" className="mb-4">
							{`Stay updated`}
						</H6>
						<Paragraph className="mb-12">
							{`
                When you sign up for the newsletter, you'll also receive
                valuable notifications for when I create new opportunities to
                improve yourself. When I launch a new season of
              `}
							<Link to="/chats">Chats with Kent</Link>
							{`,
                give a discount on my courses, or have any number of other
                exciting announcements, you'll be the first to know.
              `}
						</Paragraph>
						<H6 as="h3" className="mb-4">
							{`Reply`}
						</H6>
						<Paragraph className="mb-12">
							{`
                Yes, I do get the emails you send me in return and I do try to
                read and reply to them all. In fact, the ideas and questions you
                have while reading the content you get delivered to your inbox
                may be well suited for
              `}
							<Link to="/calls">The Call Kent Podcast</Link>
							{` or `}
							<Link to="/office-hours">Office Hours</Link>
							{` so be sure to take advantage of those opportunities as well.`}
						</Paragraph>
					</div>

					{subscribedToNewsletter ? (
						<div className="col-span-full" id="subscribe-form">
							<H3>{`Hey, you're already subscribed`}</H3>
							<Paragraph>{`Good job! There's nothing for you to do here`}</Paragraph>
						</div>
					) : (
						<>
							<div className="col-span-full lg:col-span-5">
								<H3>{`Sign up here`}</H3>
								<Paragraph>{`And get your first email this week!`}</Paragraph>
							</div>
							<div
								id="subscribe-form"
								className="col-span-full mt-8 lg:col-span-7"
							>
								<ConvertKitForm formId="newsletter" convertKitFormId="827139" />
							</div>
						</>
					)}
				</Grid>
				<BlogSection
					articles={data.blogRecommendations}
					title="Want a taste of what to expect?"
					description="Checkout these articles."
				/>
			</main>
		</>
	)
}
