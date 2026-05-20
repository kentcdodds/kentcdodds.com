import { type ReactNode } from 'react'
import { type HeadersFunction, type MetaFunction } from 'react-router'
import { ArrowLink } from '#app/components/arrow-button.tsx'
import { ButtonLink } from '#app/components/button.tsx'
import { FeatureCard } from '#app/components/feature-card.tsx'
import { Grid } from '#app/components/grid.tsx'
import {
	CheckCircledIcon,
	HeartIcon,
	MicrophoneIcon,
	RssIcon,
	TrophyIcon,
	UsersIcon,
	YoutubeIcon,
} from '#app/components/icons.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { H2, H3, H6, Paragraph } from '#app/components/typography.tsx'
import { getGenericSocialImage, getImgProps, images } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { getDisplayUrl, getUrl } from '#app/utils/misc.ts'
import { getSocialMetas } from '#app/utils/seo.ts'

const betterYouTubeUrl = 'https://www.youtube.com/c/kentcdodds-vids'
const betterRssUrl = 'https://feeds.transistor.fm/better-with-kent'
const lastSoftwareEngineerUrl =
	'https://www.epicproduct.engineer/the-last-software-engineer'

export const headers: HeadersFunction = () => ({
	'Cache-Control': 'public, max-age=3600',
})

export const meta: MetaFunction<{}, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	return getSocialMetas({
		title: 'Better with Kent',
		description:
			'Durable skills for people who ship software. Watch Better with Kent from Kent C. Dodds on YouTube.',
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			url: getDisplayUrl(requestInfo),
			featuredImage: images.microphone.id,
			words: `Better with Kent: Durable skills for people who ship software`,
		}),
	})
}

function ExternalTextLink({
	href,
	children,
}: {
	href: string
	children: ReactNode
}) {
	return (
		<a
			className="underlined focus:outline-none"
			href={href}
			target="_blank"
			rel="noreferrer noopener"
		>
			{children}
		</a>
	)
}

function ListenCard({
	title,
	description,
	icon,
	action,
}: {
	title: string
	description: string
	icon: ReactNode
	action: ReactNode
}) {
	return (
		<div className="bg-secondary flex h-full flex-col rounded-lg px-8 py-10 lg:px-12">
			<div className="text-primary mb-6">{icon}</div>
			<H3 className="mb-4">{title}</H3>
			<Paragraph className="mb-8 flex-auto">{description}</Paragraph>
			<div>{action}</div>
		</div>
	)
}

function PlaceholderBadge({ children }: { children: ReactNode }) {
	return (
		<span className="text-secondary inline-flex rounded-full border border-gray-300 px-5 py-2 text-base font-medium dark:border-gray-700">
			{children}
		</span>
	)
}

export default function BetterRoute() {
	return (
		<>
			<HeroSection
				title="Better with Kent"
				subtitle="Durable skills for people who ship software"
				imageBuilder={images.microphone}
				arrowUrl="#what-is-the-show"
				arrowLabel="What is Better with Kent?"
				action={
					<ButtonLink
						variant="primary"
						href={betterYouTubeUrl}
						target="_blank"
						rel="noreferrer noopener"
					>
						<YoutubeIcon /> Watch on YouTube
					</ButtonLink>
				}
			/>

			<main>
				<Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-6 lg:col-start-1">
						<div className="mb-12 aspect-[4/3] lg:mb-0">
							<img
								{...getImgProps(images.kentSmilingWithLaptop, {
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
											aspectRatio: '4:3',
										},
									},
								})}
							/>
						</div>
					</div>

					<div className="col-span-full lg:col-span-5 lg:col-start-8 lg:row-start-1">
						<H2 id="what-is-the-show" className="mb-10">
							A solo show about becoming the kind of person who ships better
							software.
						</H2>
						<Paragraph className="mb-12">
							Better with Kent is a talking-head video show from Kent C. Dodds
							about the durable skills that keep mattering as tools, teams, and
							careers change. Expect direct, thoughtful episodes about judgment,
							product thinking, technical leadership, and the human side of
							software work.
						</Paragraph>
						<Paragraph className="mb-12">
							It complements the guest conversations in Chats with Kent and the
							Become a Product Engineer season. This one is Kent solo: concise,
							opinionated, and focused on helping you build instincts that last.
						</Paragraph>
						<ButtonLink
							variant="primary"
							href={betterYouTubeUrl}
							target="_blank"
							rel="noreferrer noopener"
						>
							<YoutubeIcon /> Subscribe on YouTube
						</ButtonLink>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-64">
					<div className="col-span-full mb-12 hidden lg:col-span-4 lg:mb-0 lg:block">
						<H6 as="h2">Why now?</H6>
					</div>
					<div className="col-span-full mb-12 lg:col-span-8 lg:mb-20">
						<H2 as="p" className="mb-3">
							The work is changing quickly.
						</H2>
						<H2 as="p" variant="secondary">
							The people who keep shipping well are the ones who get better at
							choosing problems, understanding users, and making accountable
							tradeoffs.
						</H2>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-5 lg:pr-12">
						<H6 as="h3" className="mb-4">
							Tools are accelerating.
						</H6>
						<Paragraph className="mb-16">
							AI can make code faster, but it does not decide what is worth
							building, what risk to accept, or how to earn trust with the
							people depending on your work.
						</Paragraph>
					</div>
					<div className="col-span-full lg:col-span-4 lg:col-start-9 lg:pr-12">
						<H6 as="h3" className="mb-4">
							Craft still matters.
						</H6>
						<Paragraph className="mb-16">
							Better with Kent is for developers, product engineers, and team
							leads who want durable skills they can carry across frameworks,
							companies, and product cycles.
						</Paragraph>
					</div>
				</Grid>

				<HeaderSection
					title="What you will get better at."
					subTitle="Four durable skills that outlast the latest toolchain."
					className="mb-16"
				/>
				<Grid className="mb-24 lg:mb-64" rowGap>
					<div className="col-span-full lg:col-span-6">
						<FeatureCard
							title="Judgment"
							description="Practice making technical and product tradeoffs with the constraints in view, not just the code in front of you."
							icon={<TrophyIcon size={48} />}
						/>
					</div>
					<div className="col-span-full lg:col-span-6">
						<FeatureCard
							title="Accountability"
							description="Own outcomes, communicate risk, and develop the reliability people trust when the work gets ambiguous."
							icon={<CheckCircledIcon size={48} />}
						/>
					</div>
					<div className="col-span-full lg:col-span-6">
						<FeatureCard
							title="Problem clarity"
							description="Get sharper at naming the real problem so your implementation energy lands where it creates value."
							icon={<MicrophoneIcon size={48} />}
						/>
					</div>
					<div className="col-span-full lg:col-span-6">
						<FeatureCard
							title="Empathy"
							description="Build the habit of seeing the humans around the software: users, teammates, stakeholders, and future maintainers."
							icon={<HeartIcon size={48} />}
						/>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-64" featured>
					<div className="col-span-full lg:col-span-5">
						<H6 as="h2" className="mb-6">
							Episode 1 spotlight
						</H6>
						<H2 className="mb-8">The Last Software Engineer</H2>
						<Paragraph className="mb-12">
							The first episode is upcoming and starts with the question behind
							Kent's essay: if AI changes the day-to-day mechanics of writing
							code, what kind of engineer remains valuable?
						</Paragraph>
						<ArrowLink href={lastSoftwareEngineerUrl} direction="top-right">
							Read the essay
						</ArrowLink>
					</div>
					<div className="col-span-full mt-12 lg:col-span-6 lg:col-start-7 lg:mt-0">
						<div className="bg-primary rounded-lg p-8 shadow-xl lg:p-12 dark:bg-gray-950">
							<Paragraph
								prose={false}
								className="mb-6 text-base tracking-[0.25em] uppercase"
								textColorClassName="text-secondary"
							>
								Coming soon
							</Paragraph>
							<H3 className="mb-6">Episode 1: The Last Software Engineer</H3>
							<Paragraph className="mb-8">
								Watch the first episode on YouTube when it lands. The feed is
								ready for podcast apps too, but YouTube is the best place to
								follow the show first.
							</Paragraph>
							<ButtonLink
								variant="secondary"
								href={betterYouTubeUrl}
								target="_blank"
								rel="noreferrer noopener"
							>
								<YoutubeIcon /> Watch on YouTube
							</ButtonLink>
						</div>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-6 lg:col-start-7">
						<div className="mb-12 lg:mb-0">
							<img
								{...getImgProps(images.microphoneWithHands, {
									className: 'rounded-lg object-cover',
									widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
									sizes: [
										'(max-width: 1023px) 80vw',
										'(min-width: 1024px) and (max-width: 1620px) 40vw',
										'650px',
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

					<div className="col-span-full lg:col-span-5 lg:col-start-1 lg:row-start-1">
						<H2 className="mb-10">Want guest conversations too?</H2>
						<H2 variant="secondary" as="p" className="mb-12">
							Better with Kent is Kent solo. For long-form guest conversations
							about becoming a product engineer, listen to Chats with Kent.
						</H2>
						<ArrowLink to="/chats/07">Become a Product Engineer</ArrowLink>
					</div>
				</Grid>

				<HeaderSection
					title="Listen and watch."
					subTitle="YouTube is the primary home. Podcast app links can grow here as they become available."
					className="mb-16"
				/>
				<Grid className="mb-24 lg:mb-64" rowGap>
					<div className="col-span-full lg:col-span-4">
						<ListenCard
							title="YouTube"
							description="Subscribe on YouTube for the primary Better with Kent experience and future playlist updates."
							icon={<YoutubeIcon size={48} />}
							action={
								<ButtonLink
									variant="primary"
									size="medium"
									href={betterYouTubeUrl}
									target="_blank"
									rel="noreferrer noopener"
								>
									Watch on YouTube
								</ButtonLink>
							}
						/>
					</div>
					<div className="col-span-full lg:col-span-4">
						<ListenCard
							title="RSS"
							description="Prefer a podcast app? Add the RSS feed directly while Apple Podcasts and Spotify listings are pending."
							icon={<RssIcon size={48} />}
							action={
								<ArrowLink href={betterRssUrl} direction="top-right">
									Open RSS feed
								</ArrowLink>
							}
						/>
					</div>
					<div className="col-span-full lg:col-span-4">
						<ListenCard
							title="Apple and Spotify"
							description="Dedicated Apple Podcasts and Spotify links will go here once those listings are live."
							icon={<UsersIcon size={48} />}
							action={
								<div className="flex flex-wrap gap-3">
									<PlaceholderBadge>Apple coming soon</PlaceholderBadge>
									<PlaceholderBadge>Spotify coming soon</PlaceholderBadge>
								</div>
							}
						/>
					</div>
					<div className="col-span-full">
						<div className="border-secondary rounded-lg border border-dashed p-8 lg:p-12">
							<H3 className="mb-4">Future playlist embed</H3>
							<Paragraph>
								When the Better with Kent YouTube playlist is ready, this
								section can host an inline playlist embed without changing the
								page structure.
							</Paragraph>
						</div>
					</div>
				</Grid>

				<Grid className="mb-24 lg:mb-64">
					<div className="col-span-full lg:col-span-4 lg:col-start-2">
						<img
							loading="lazy"
							{...getImgProps(images.microphone, {
								className: 'object-contain',
								widths: [420, 512, 840, 1260, 1024, 1680, 2520],
								sizes: [
									'(max-width: 1023px) 80vw',
									'(min-width: 1024px) and (max-width: 1620px) 40vw',
									'630px',
								],
							})}
						/>
					</div>

					<div className="col-span-full mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">
						<H2 className="mb-8">Get better at the work beyond the code.</H2>
						<H2 variant="secondary" as="p" className="mb-16">
							Subscribe on YouTube and follow along as Better with Kent starts
							with The Last Software Engineer.
						</H2>
						<div className="flex flex-col gap-6 sm:flex-row sm:items-center">
							<ButtonLink
								variant="primary"
								href={betterYouTubeUrl}
								target="_blank"
								rel="noreferrer noopener"
							>
								<YoutubeIcon /> Subscribe on YouTube
							</ButtonLink>
							<ExternalTextLink href={betterRssUrl}>RSS feed</ExternalTextLink>
						</div>
					</div>
				</Grid>
			</main>
		</>
	)
}
