import { clsx } from 'clsx'
import * as React from 'react'
import { data as json, redirect, Form, useActionData, useLoaderData } from 'react-router';
import { Button } from '#app/components/button.tsx'
import { Field, InputError } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { CheckCircledIcon } from '#app/components/icons.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H6, Paragraph } from '#app/components/typography.tsx'
import { getImgProps, images } from '#app/images.tsx'
import { tagKCDSiteSubscriber } from '#app/kit/kit.server.ts'
import { type KCDHandle, type Team } from '#app/types.ts'
import { handleFormSubmission } from '#app/utils/actions.server.ts'
import { shuffle } from '#app/utils/cjs/lodash.ts'
import { getClientSession } from '#app/utils/client.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getErrorStack, isTeam, teams } from '#app/utils/misc.tsx'
import {
	TEAM_ONEWHEELING_MAP,
	TEAM_SKIING_MAP,
	TEAM_SNOWBOARD_MAP,
} from '#app/utils/onboarding.ts'
import { prisma, validateMagicLink } from '#app/utils/prisma.server.ts'
import { getSession, getUser } from '#app/utils/session.server.ts'
import { useTeam } from '#app/utils/team-provider.tsx'
import  { type Route } from './+types/signup'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type ActionData = {
	status: 'success' | 'error'
	fields: {
		firstName: string | null
		team: Team | null
	}
	errors: {
		generalError?: string
		firstName: string | null
		team: string | null
	}
}

function getErrorForFirstName(name: string | null) {
	if (!name) return `Name is required`
	if (name.length > 60) return `Name is too long`
	return null
}

function getErrorForTeam(team: string | null) {
	if (!team) return `Team is required`
	if (!isTeam(team)) return `Please choose a valid team`
	return null
}

const actionIds = {
	cancel: 'cancel',
	signUp: 'sign up',
}

export async function action({ request }: Route.ActionArgs) {
	const loginInfoSession = await getLoginInfoSession(request)

	const requestText = await request.text()
	const form = new URLSearchParams(requestText)
	if (form.get('actionId') === actionIds.cancel) {
		loginInfoSession.clean()
		return redirect('/', {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	const session = await getSession(request)
	const magicLink = loginInfoSession.getMagicLink()
	let email: string
	try {
		if (typeof magicLink !== 'string') {
			throw new Error('email and magicLink required.')
		}

		email = await validateMagicLink(magicLink, loginInfoSession.getMagicLink())
	} catch (error: unknown) {
		console.error(getErrorStack(error))

		loginInfoSession.clean()
		loginInfoSession.flashError(
			'Sign in link invalid. Please request a new one.',
		)
		return redirect('/login', {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	return handleFormSubmission<ActionData>({
		form,
		validators: {
			firstName: getErrorForFirstName,
			team: getErrorForTeam,
		},
		handleFormValues: async (formData) => {
			const { firstName, team } = formData

			try {
				const user = await prisma.user.create({
					data: { email, firstName, team },
				})

				// add user to mailing list
				const sub = await tagKCDSiteSubscriber({
					email,
					firstName,
					fields: { kcd_team: team, kcd_site_id: user.id },
				})
				await prisma.user.update({
					data: { kitId: String(sub.id) },
					where: { id: user.id },
				})
				const clientSession = await getClientSession(request, null)
				const clientId = clientSession.getClientId()
				// update all PostReads from clientId to userId
				if (clientId) {
					await prisma.postRead.updateMany({
						data: { userId: user.id, clientId: null },
						where: { clientId },
					})
				}
				clientSession.setUser(user)

				const headers = new Headers()
				await session.signIn(user)
				await session.getHeaders(headers)
				await clientSession.getHeaders(headers)
				// IDEA: try using destroy... Didn't seem to work last time I tried though.
				loginInfoSession.clean()
				await loginInfoSession.getHeaders(headers)
				return redirect('/me', { headers })
			} catch (error: unknown) {
				console.error(getErrorStack(error))

				loginInfoSession.flashError(
					'There was a problem creating your account. Please try again.',
				)
				return redirect('/login', {
					headers: await loginInfoSession.getHeaders(),
				})
			}
		},
	})
}

export async function loader({ request }: Route.LoaderArgs) {
	const user = await getUser(request)
	if (user) return redirect('/me')

	const loginInfoSession = await getLoginInfoSession(request)
	const magicLink = loginInfoSession.getMagicLink()
	const email = loginInfoSession.getEmail()
	if (!magicLink || !email) {
		loginInfoSession.clean()
		loginInfoSession.flashError('Invalid magic link. Try again.')
		return redirect('/login', {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	const userForMagicLink = await prisma.user.findFirst({
		where: { email },
		select: { id: true },
	})

	if (userForMagicLink) {
		// user exists, but they haven't clicked their magic link yet
		// we don't want to tell them that a user exists with that email though
		// so we'll invalidate the magic link and force them to try again.
		loginInfoSession.clean()
		loginInfoSession.flashError('Invalid magic link. Try again.')
		return redirect('/login', {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	const activities = ['skiing', 'snowboarding', 'onewheeling'] as const
	const activity: 'skiing' | 'snowboarding' | 'onewheeling' =
		activities[Math.floor(Math.random() * activities.length)] ?? 'skiing'
	return json(
		{
			email,
			// have to put this shuffle in the loader to ensure server render is the same as the client one.
			teamsInOrder: shuffle(teams),
			teamMap: activity,
		} as const,
		{
			headers: await loginInfoSession.getHeaders(),
		},
	)
}

interface TeamOptionProps {
	teamMap: 'skiing' | 'snowboarding' | 'onewheeling'
	team: Team
	error?: string | null
	selected: boolean
}

function TeamOption({
	teamMap,
	team: value,
	error,
	selected,
}: TeamOptionProps) {
	const team = {
		skiing: TEAM_SKIING_MAP,
		snowboarding: TEAM_SNOWBOARD_MAP,
		onewheeling: TEAM_ONEWHEELING_MAP,
	}[teamMap][value]

	// On mobile we render a compact "profile" version to avoid the big cards
	// taking over the entire signup flow (issue #86).
	const profileImage = {
		BLUE: images.kodyProfileBlue,
		RED: images.kodyProfileRed,
		YELLOW: images.kodyProfileYellow,
	}[value]

	const { className: profileClassName, ...profileImgProps } = getImgProps(
		profileImage,
		{
			className:
				'mx-auto mb-3 block h-14 w-14 rounded-full object-contain lg:mb-16 lg:h-auto lg:w-auto lg:rounded-none',
			widths: [80, 96, 112, 128, 160, 192],
			sizes: ['(max-width: 1023px) 26vw', '80px'],
			transformations: { resize: { type: 'pad', aspectRatio: '1:1' } },
		},
	)

	const sportImgProps = getImgProps(team.image, {
		className: 'mx-auto mb-16 block',
		widths: [350, 512, 685, 1370, 2055],
		sizes: [
			'(min-width:1023px) and (max-width:1620px) 20vw',
			'320px',
		],
	})

	return (
		<div
			className={clsx(
				'focus-ring relative rounded-lg bg-gray-100 dark:bg-gray-800 lg:col-span-4',
				team.focusClassName,
				{
					'ring-2': selected,
				},
			)}
		>
			{selected ? (
				<span className="text-team-current absolute top-2 left-2 lg:top-9 lg:left-9">
					<CheckCircledIcon size={28} />
				</span>
			) : null}

			<label className="flex cursor-pointer flex-col items-center justify-center px-3 py-4 text-center lg:block lg:px-12 lg:pt-20 lg:pb-12">
				<input
					className="sr-only"
					type="radio"
					name="team"
					value={value}
					aria-describedby={error ? 'team-error' : undefined}
				/>
				<picture>
					<source
						media="(min-width: 1024px)"
						srcSet={sportImgProps.srcSet}
						sizes={sportImgProps.sizes}
					/>
					<img
						{...profileImgProps}
						alt=""
						aria-hidden="true"
						className={clsx(profileClassName)}
					/>
				</picture>
				<H6 as="span" className="text-sm leading-none lg:text-lg">
					<span className="lg:hidden" aria-hidden="true">
						{team.label.replace(' Team', '')}
					</span>
					<span className="sr-only lg:hidden">{team.label}</span>
					<span className="hidden lg:inline">{team.label}</span>
				</H6>
			</label>
		</div>
	)
}

export default function NewAccount() {
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	const actionData = useActionData<Route.ComponentProps['actionData']>()
	const [, setTeam] = useTeam()
	const [formValues, setFormValues] = React.useState<{
		firstName: string
		team?: Team
	}>({
		firstName: '',
		team: undefined,
	})

	const team = formValues.team
	React.useEffect(() => {
		if (team && teams.includes(team)) setTeam(team)
	}, [team, setTeam])
	const formIsValid =
		formValues.firstName.trim().length > 0 && formValues.team !== undefined

	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Let's start with choosing a team."
				subTitle="You can't change this later."
				className="mb-16"
			/>
			<main>
				<Form
					method="POST"
					onChange={(event) => {
						const formData = new FormData(event.currentTarget)
						const firstName = formData.get('firstName')
						const team = formData.get('team')
						const selectedTeam =
							typeof team === 'string' && isTeam(team) ? team : undefined
						setFormValues({
							firstName: typeof firstName === 'string' ? firstName : '',
							team: selectedTeam,
						})
					}}
				>
					<input type="hidden" name="actionId" value={actionIds.signUp} />
					<Grid>
						{actionData?.errors.team ? (
							<div className="col-span-full mb-4 text-right">
								<InputError id="team-error">
									{actionData.errors.team}
								</InputError>
							</div>
						) : null}

						<fieldset className="col-span-full border-0 p-0">
							<legend className="sr-only">Team</legend>
							<div className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-12 lg:gap-6">
								{data.teamsInOrder.map((teamOption) => (
									<TeamOption
										key={teamOption}
										teamMap={data.teamMap}
										team={teamOption}
										error={actionData?.errors.team}
										selected={formValues.team === teamOption}
									/>
								))}
							</div>
						</fieldset>

						<div className="col-span-full h-20 lg:h-24" />

						<div className="col-span-full mb-12">
							<H2>{`Some basic info to remember you.`}</H2>
							<H2 variant="secondary" as="p">
								{`You can change this later.`}
							</H2>
						</div>

						<div className="col-span-full mb-12 lg:col-span-5 lg:mb-20">
							<Field
								name="firstName"
								label="First name"
								error={actionData?.errors.firstName}
								autoComplete="given-name"
								defaultValue={actionData?.fields.firstName ?? ''}
								required
							/>
						</div>

						<div className="col-span-full mb-12 lg:col-span-5 lg:col-start-7 lg:mb-20">
							<Field
								name="email"
								label="Email"
								description={
									<span>
										{`This controls your avatar via `}
										<a
											className="underlined font-bold"
											href="https://gravatar.com"
											target="_blank"
											rel="noreferrer noopener"
										>
											Gravatar
										</a>
										{'.'}
									</span>
								}
								defaultValue={data.email}
								readOnly
								disabled
							/>
						</div>

						<div className="col-span-full">
						<Button type="submit" disabled={!formIsValid}>
							{`Create account`}
						</Button>
						</div>
						<p className="text-primary col-span-4 mt-10 text-xs font-medium tracking-wider">
							{`
              NOTICE: By signing up for an account, your email address will be
              added to Kent's mailing list (if it's not already) and
              you'll occasionally receive promotional emails from Kent. You
              can unsubscribe at any time.
            `}
						</p>
					</Grid>
				</Form>
				<Spacer size="2xs" />
				<Grid>
					<Form method="POST">
						<input type="hidden" name="actionId" value={actionIds.cancel} />
						<Button type="submit" variant="danger">
							{`Cancel`}
						</Button>
					</Form>
				</Grid>
				<Spacer size="lg" />
				<Grid>
					<div className="col-span-full lg:col-span-5 lg:col-start-8">
						<H2 className="mb-32">{`You might be thinking, why pick a team?`}</H2>

						<H6 as="h3" className="mb-4">
							{`Own a post`}
						</H6>
						<Paragraph className="mb-12">
							{`
              Your team associates your blog post reads with a group and it's
              fun to know that your contributing to a group while learning
              and reading. When your team has the highest ranking on a post,
              you "own" that post. Kinda like an NFT, but not really.
            `}
						</Paragraph>
						<H6 as="h3" className="mb-4">
							{`Exclusive team discord channels`}
						</H6>
						<Paragraph className="mb-12">
							{`
              After signing up you can connect your discord account. When you do
              this, your account will be given a team role. This will give you
              access to your team channels where you can plan team blog post
              raids and fun stuff like that.
            `}
						</Paragraph>
						<H6 as="h3" className="mb-4">
							{`UI Theme`}
						</H6>
						<Paragraph className="mb-12">
							{`
              The theme of this website is controlled by your team color
              selection. So choose your favorite color and have that preference
              shown throughout the site.
            `}
						</Paragraph>
					</div>

					<div className="col-span-full lg:col-span-6 lg:col-start-1 lg:row-start-1">
						<div className="aspect-[4/6]">
							<img
								{...getImgProps(images.kentPalmingSoccerBall, {
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
				</Grid>
			</main>
		</div>
	)
}
