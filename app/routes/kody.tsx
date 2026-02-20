import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { type MetaFunction } from 'react-router';
import {
	HeroSection,
	getHeroImageProps,
} from '#app/components/sections/hero-section.tsx'
import { H2 } from '#app/components/typography.js'
import { images, kodyImages } from '#app/images.tsx'
import { optionalTeams, type OptionalTeam } from '#app/utils/misc.tsx'
import { useTeam } from '#app/utils/team-provider.tsx'

export const meta: MetaFunction = () => [
	{ title: 'Kody the Koala' },
	{
		name: 'description',
		content:
			'Meet Kody the Koala, the friendly mascot of the KCD Community! Learn about his story and download your favorite Kody image.',
	},
]

function KodyChooser() {
	const [userTeam] = useTeam()
	const [team, setTeam] = React.useState<OptionalTeam>(userTeam ?? 'UNKNOWN')
	const [style, setStyle] = React.useState<'normal' | 'flying'>('normal')

	// Define image type options for each style
	const normalImageOptions = [
		{ label: 'Profile', value: 'profile' },
		{ label: 'Snowboarding', value: 'snowboarding' },
		{ label: 'Skiing', value: 'skiing' },
		{ label: 'Onewheeling', value: 'onewheeling' },
		{ label: 'Playing Soccer', value: 'playingSoccer' },
		{ label: 'Back Flipping', value: 'backFlipping' },
	] as const
	const flyingImageOptions = [
		{ label: 'Snowboarding', value: 'flyingSnowboarding' },
		{ label: 'Skiing', value: 'flyingSkiing' },
		{ label: 'Onewheeling', value: 'flyingOnewheeling' },
		{ label: 'Playing Soccer', value: 'flyingPlayingSoccer' },
		{ label: 'Back Flipping', value: 'flyingBackFlipping' },
	] as const

	const imageOptions =
		style === 'normal' ? normalImageOptions : flyingImageOptions
	type KodyImageType = (typeof imageOptions)[number]['value']
	// Default to first option for the style
	const [type, setType] = React.useState<KodyImageType>(imageOptions[0].value)

	const imageObj = kodyImages[type]?.[team ?? 'UNKNOWN']

	return (
		<div className="mx-auto my-8 flex flex-col gap-4 text-center">
			<div className="flex flex-wrap items-center justify-center gap-4">
				<label>
					Team Color:{' '}
					<select
						value={team}
						onChange={(e) => setTeam(e.target.value as OptionalTeam)}
					>
						{optionalTeams.map((t: OptionalTeam) => (
							<option key={t} value={t}>
								{t.charAt(0) + t.slice(1).toLowerCase()}
							</option>
						))}
					</select>
				</label>
				<label>
					Style:{' '}
					<select
						value={style}
						onChange={(e) => {
							const newStyle = e.target.value as 'normal' | 'flying'
							setStyle(newStyle)

							if (newStyle === 'flying' && type === 'profile') {
								setType(flyingImageOptions[0].value)
							} else if (newStyle === 'normal') {
								const withoutFlying = type.replace('flying', '')
								const newType =
									withoutFlying.charAt(0).toLowerCase() + withoutFlying.slice(1)
								setType(newType as any)
							} else if (newStyle === 'flying') {
								setType(
									`flying${type.charAt(0).toUpperCase()}${type.slice(1)}` as any,
								)
							}
						}}
					>
						<option value="normal">Normal</option>
						<option value="flying">Flying</option>
					</select>
				</label>
				<label>
					Kody Image:{' '}
					<select
						value={type}
						onChange={(e) => setType(e.target.value as KodyImageType)}
					>
						{imageOptions.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>
				</label>
			</div>
			<div className="flex flex-col items-center">
				<img
					key={`${team}-${type}-${style}`}
					src={imageObj({ resize: { width: 800, height: 800, type: 'pad' } })}
					alt={imageObj.alt}
					className="h-96 w-96 rounded-lg object-contain"
				/>
				<div style={{ marginTop: 12 }}>
					<a
						href={imageObj()}
						download={`kody-${team.toLowerCase()}-${type}.png`}
						className="text-blue-600 underline"
					>
						Download this image
					</a>
				</div>
			</div>
		</div>
	)
}

export default function KodyPage() {
	const [userTeam] = useTeam()
	const profileImage =
		userTeam === 'BLUE'
			? images.kodyProfileBlue
			: userTeam === 'RED'
				? images.kodyProfileRed
				: userTeam === 'YELLOW'
					? images.kodyProfileYellow
					: images.kodyProfileGray

	return (
		<>
			<HeroSection
				title="Meet Kody the Koala 🐨"
				subtitle="The friendly mascot of the KCD Community."
				image={
					<img
						{...getHeroImageProps(profileImage)}
						alt="Kody the Koala"
						className="rounded-lg"
					/>
				}
				imageSize="medium"
				arrowUrl="#chooser"
				arrowLabel="Choose your Kody image"
			/>
			<main className="mx-auto flex flex-col items-center">
				<section className="prose dark:prose-dark">
					<H2>Who is Kody?</H2>
					<p className="mb-8 text-lg">
						Kody the Koala is the beloved mascot of the KCD Community. If you've
						participated in Kent's workshops or courses, you've probably seen
						Kody pop up as an emoji (🐨) whenever you're supposed to <em>do</em>{' '}
						something. Kody helps make learning more fun and engaging!
					</p>
					<H2>Where did Kody come from?</H2>
					<p className="mb-4">
						When Kent was creating self-paced workshops, he wanted a way to
						clearly show the difference between explanations and actionable
						steps. The solution? A friendly mascot! Kody the Koala became the
						symbol for action, encouragement, and community spirit. (Fun fact:
						Kody replaced Terry the Tiger 🐯 as the original mascot!)
					</p>
					<ul className="mb-4 list-inside list-disc">
						<li>Friendly encouragement</li>
						<li>Community and teamwork</li>
						<li>Taking action and having fun while learning</li>
					</ul>
				</section>
				<section className="prose dark:prose-dark" id="chooser">
					<H2>Choose Your Favorite Kody</H2>
					<p className="mb-4">
						Kody comes in many styles and team colors! Use the chooser below to
						pick your favorite Kody image, then download it to use as an avatar,
						sticker, or just for fun.
					</p>
					<ErrorBoundary fallback={<p>Error</p>}>
						<KodyChooser />
					</ErrorBoundary>
				</section>
				<section className="mx-auto max-w-2xl border-t pt-8 text-center">
					<p>
						Want to see Kody in action? Join the{' '}
						<a href="/discord" className="text-blue-600 underline">
							KCD Community
						</a>{' '}
						and pick your team color to participate in fun activities, earn
						points, and connect with others!
					</p>
				</section>
			</main>
		</>
	)
}
