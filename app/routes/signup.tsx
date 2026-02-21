import { clsx } from 'clsx'
import * as React from 'react'
import { Button, ButtonLink } from '#app/components/button.tsx'
import { data as json, redirect, Form } from 'react-router'
import { Field, InputError } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { CheckCircledIcon } from '#app/components/icons.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H6, Paragraph } from '#app/components/typography.tsx'
import { getImgProps, images } from '#app/images.tsx'
import { tagKCDSiteSubscriber } from '#app/kit/kit.server.ts'
import { type KCDHandle, type Team } from '#app/types.ts'
import { shuffle } from '#app/utils/cjs/lodash.ts'
import { getClientSession } from '#app/utils/client.server.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getDomainUrl, getErrorStack, isTeam, teams } from '#app/utils/misc.ts'
import {
	TEAM_ONEWHEELING_MAP,
	TEAM_SKIING_MAP,
	TEAM_SNOWBOARD_MAP,
} from '#app/utils/onboarding.ts'
import { getPasswordHash, getPasswordStrengthError } from '#app/utils/password.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendSignupVerificationEmail } from '#app/utils/send-email.server.ts'
import { getSession, getUser } from '#app/utils/session.server.ts'
import { useTeam } from '#app/utils/team-provider.tsx'
import {
	consumeVerification,
	consumeVerificationForTarget,
	createVerification,
} from '#app/utils/verification.server.ts'
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
		password: string | null
		confirmPassword: string | null
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

async function getErrorForPassword(password: string | null) {
	return getPasswordStrengthError(password ?? '')
}

const actionIds = {
	cancel: 'cancel',
	requestCode: 'request code',
	verifyCode: 'verify code',
	signUp: 'sign up',
}

export async function action({ request }: Route.ActionArgs) {
	const loginInfoSession = await getLoginInfoSession(request)

	const requestText = await request.text()
	const form = new URLSearchParams(requestText)
	const actionId = form.get('actionId')

	if (actionId === actionIds.cancel) {
		loginInfoSession.clean()
		return redirect('/', {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	if (actionId === actionIds.requestCode) {
		const emailAddress = form.get('email')
		const email =
			typeof emailAddress === 'string' ? emailAddress.trim().toLowerCase() : ''
		if (email) loginInfoSession.setEmail(email)

		if (!email.match(/.+@.+/)) {
			loginInfoSession.flashError('A valid email is required')
			return redirect('/signup', {
				headers: await loginInfoSession.getHeaders(),
			})
		}

		const userExists = await prisma.user.findUnique({
			where: { email },
			select: { id: true },
		})
		if (userExists) {
			loginInfoSession.flashMessage(
				'An account already exists for that email. Log in instead (or reset your password).',
			)
			return redirect('/login', { headers: await loginInfoSession.getHeaders() })
		}

		const { verification, code } = await createVerification({
			type: 'SIGNUP',
			target: email,
		})

		const domainUrl = getDomainUrl(request)
		const verificationUrl = new URL('/signup', domainUrl)
		verificationUrl.searchParams.set('verification', verification.id)
		verificationUrl.searchParams.set('code', code)

		try {
			await sendSignupVerificationEmail({
				emailAddress: email,
				verificationCode: code,
				verificationUrl: verificationUrl.toString(),
				domainUrl,
			})
		} catch (error) {
			// Avoid leaving an unused verification record around if email sending fails.
			try {
				await ensurePrimary()
				await prisma.verification.delete({ where: { id: verification.id } })
			} catch (cleanupError) {
				console.error(
					'Failed to cleanup verification after email send failure',
					cleanupError,
				)
			}
			console.error('Failed to send signup verification email', error)
			loginInfoSession.flashError(
				'Unable to send verification email right now. Please try again.',
			)
			return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
		}

		loginInfoSession.flashMessage(`Verification code sent to ${email}.`)
		return redirect(`/signup?verification=${verification.id}`, {
			headers: await loginInfoSession.getHeaders(),
		})
	}

	if (actionId === actionIds.verifyCode) {
		const verificationId = form.get('verificationId')
		const code = form.get('code')
		if (typeof code !== 'string' || !code) {
			loginInfoSession.flashError('Verification code required')
			return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
		}

		const result =
			typeof verificationId === 'string' && verificationId
				? await consumeVerification({
						id: verificationId,
						code,
						type: 'SIGNUP',
					})
				: await consumeVerificationForTarget({
						target: (form.get('email') ?? loginInfoSession.getEmail() ?? '')
							.toString()
							.trim()
							.toLowerCase(),
						code,
						type: 'SIGNUP',
					})

		if (!result) {
			loginInfoSession.flashError(
				'Verification code invalid or expired. Please request a new one.',
			)
			return redirect(
				typeof verificationId === 'string' && verificationId
					? `/signup?verification=${verificationId}`
					: '/signup',
				{
					headers: await loginInfoSession.getHeaders(),
				},
			)
		}

		loginInfoSession.setSignupEmail(result.target)
		loginInfoSession.setEmail(result.target)
		loginInfoSession.flashMessage('Email verified. Finish creating your account.')
		return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
	}

	const signupEmail = loginInfoSession.getSignupEmail()
	if (!signupEmail) {
		loginInfoSession.flashError('Verify your email first to create an account.')
		return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
	}

	const firstName = form.get('firstName')
	const team = form.get('team')
	const password = form.get('password')
	const confirmPassword = form.get('confirmPassword')

	const errors: ActionData['errors'] = {
		firstName: getErrorForFirstName(typeof firstName === 'string' ? firstName : null),
		team: getErrorForTeam(typeof team === 'string' ? team : null),
		password: await getErrorForPassword(typeof password === 'string' ? password : null),
		confirmPassword: (() => {
			if (typeof confirmPassword !== 'string' || !confirmPassword) {
				return 'Confirm your password'
			}
			if (confirmPassword !== password) return 'Passwords must match'
			return null
		})(),
	}

	if (Object.values(errors).some((e) => e !== null)) {
		return json(
			{
				status: 'error',
				fields: {
					firstName: typeof firstName === 'string' ? firstName : null,
					team: typeof team === 'string' && isTeam(team) ? team : null,
				},
				errors: { ...errors },
			} satisfies ActionData,
			400,
		)
	}

	try {
		const safeFirstName = String(firstName).trim()
		const safeTeam = team as Team
		const safePassword = String(password)

		const passwordHash = await getPasswordHash(safePassword)
		await ensurePrimary()
		let user: { id: string }
		try {
			user = await prisma.user.create({
				data: {
					email: signupEmail,
					firstName: safeFirstName,
					team: safeTeam,
					password: { create: { hash: passwordHash } },
				},
				select: { id: true },
			})
		} catch (error: unknown) {
			// If the account was created in another concurrent attempt, send the user to login.
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
				loginInfoSession.clean()
				loginInfoSession.flashMessage(
					'An account already exists for that email. Log in instead (or reset your password).',
				)
				return redirect('/login', { headers: await loginInfoSession.getHeaders() })
			}
			throw error
		}

		// Best-effort: don't block account creation on mailing-list issues.
		void tagKCDSiteSubscriber({
			email: signupEmail,
			firstName: safeFirstName,
			fields: { kcd_team: safeTeam, kcd_site_id: user.id },
		})
			.then(async (sub) => {
				await ensurePrimary()
				await prisma.user.update({
					data: { kitId: String(sub.id) },
					where: { id: user.id },
				})
			})
			.catch((error) => {
				console.error('Failed to tag subscriber on signup', error)
			})

		const session = await getSession(request)
		await session.signIn(user)

		let clientSession: Awaited<ReturnType<typeof getClientSession>> | null = null
		try {
			clientSession = await getClientSession(request, null)
			const clientId = clientSession.getClientId()
			// update all PostReads from clientId to userId
			if (clientId) {
				await ensurePrimary()
				await prisma.postRead.updateMany({
					data: { userId: user.id, clientId: null },
					where: { clientId },
				})
			}
			clientSession.setUser({})
		} catch (error) {
			console.error('Failed to migrate client data on signup', error)
		}

		const headers = new Headers()
		await session.getHeaders(headers)
		if (clientSession) await clientSession.getHeaders(headers)
		loginInfoSession.clean()
		await loginInfoSession.getHeaders(headers)
		return redirect('/me', { headers })
	} catch (error: unknown) {
		console.error(getErrorStack(error))
		return json(
			{
				status: 'error',
				fields: {
					firstName: typeof firstName === 'string' ? firstName : null,
					team: typeof team === 'string' && isTeam(team) ? team : null,
				},
				errors: {
					firstName: null,
					team: null,
					password: null,
					confirmPassword: null,
					generalError: 'There was a problem creating your account. Please try again.',
				},
			} satisfies ActionData,
			500,
		)
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const user = await getUser(request)
	if (user) return redirect('/me')

	const loginInfoSession = await getLoginInfoSession(request)

	const url = new URL(request.url)
	const verificationId = url.searchParams.get('verification')
	const code = url.searchParams.get('code')

	// Support verification links in email.
	if (verificationId && code) {
		const result = await consumeVerification({
			id: verificationId,
			code,
			type: 'SIGNUP',
		})
		if (result) {
			loginInfoSession.setSignupEmail(result.target)
			loginInfoSession.setEmail(result.target)
			loginInfoSession.flashMessage('Email verified. Finish creating your account.')
			return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
		}
		loginInfoSession.flashError(
			'Verification link invalid or expired. Please request a new one.',
		)
		return redirect('/signup', { headers: await loginInfoSession.getHeaders() })
	}

	const signupEmail = loginInfoSession.getSignupEmail()
	const email = loginInfoSession.getEmail()
	const error = loginInfoSession.getError()
	const message = loginInfoSession.getMessage()

	if (!signupEmail) {
		return json(
			{
				step: 'verify',
				email: email ?? '',
				error,
				message,
				verificationId,
			} as const,
			{ headers: await loginInfoSession.getHeaders() },
		)
	}

	// If a user already exists for this email, stop signup and send them to login.
	const userExists = await prisma.user.findUnique({
		where: { email: signupEmail },
		select: { id: true },
	})
	if (userExists) {
		loginInfoSession.unsetSignupEmail()
		loginInfoSession.flashMessage(
			'An account already exists for that email. Log in instead (or reset your password).',
		)
		return redirect('/login', { headers: await loginInfoSession.getHeaders() })
	}

	const activities = ['skiing', 'snowboarding', 'onewheeling'] as const
	const activity: 'skiing' | 'snowboarding' | 'onewheeling' =
		activities[Math.floor(Math.random() * activities.length)] ?? 'skiing'
	return json(
		{
			step: 'onboarding',
			email: signupEmail,
			error,
			message,
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

	// Mobile uses the full illustration, but sized down so all three options can
	// fit in a single row (issue #86).
	const { className: teamImageClassName, ...teamImageProps } = getImgProps(
		team.image,
		{
			className:
				'mx-auto mb-2 block h-16 w-16 object-contain sm:h-20 sm:w-20 lg:mb-16 lg:h-auto lg:w-auto',
			widths: [64, 80, 96, 128, 160, 256, 320, 350, 512, 685, 1370],
			sizes: [
				'(max-width: 479px) 64px',
				'(min-width: 480px) and (max-width: 1023px) 80px',
				'(min-width:1024px) and (max-width:1620px) 20vw',
				'320px',
			],
		},
	)

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

			<label className="flex cursor-pointer flex-col items-center justify-center px-1 py-3 text-center sm:px-2 lg:block lg:px-12 lg:pt-20 lg:pb-12">
				<input
					className="sr-only"
					type="radio"
					name="team"
					value={value}
					aria-describedby={error ? 'team-error' : undefined}
				/>
				<img
					{...teamImageProps}
					alt=""
					aria-hidden="true"
					className={teamImageClassName}
				/>
				<span className="text-sm font-medium leading-none text-black dark:text-white lg:text-lg">
					<span className="lg:hidden" aria-hidden="true">
						{team.label.replace(' Team', '')}
					</span>
					<span className="sr-only lg:hidden">{team.label}</span>
					<span className="hidden lg:inline">{team.label}</span>
				</span>
			</label>
		</div>
	)
}

export default function NewAccount({
	loaderData: data,
	actionData,
}: Route.ComponentProps) {
	const [, setTeam] = useTeam()

	const [formValues, setFormValues] = React.useState<{
		firstName: string
		team?: Team
		password: string
		confirmPassword: string
	}>({
		firstName: '',
		team: undefined,
		password: '',
		confirmPassword: '',
	})

	const team = formValues.team
	React.useEffect(() => {
		if (team && teams.includes(team)) setTeam(team)
	}, [team, setTeam])

	const passwordIsValid =
		formValues.password.length >= 8 &&
		formValues.password === formValues.confirmPassword
	const formIsValid =
		formValues.firstName.trim().length > 0 &&
		formValues.team !== undefined &&
		passwordIsValid

	if (data.step === 'verify') {
		return (
			<div className="mt-24 pt-6">
				<HeaderSection
					as="header"
					title="Create your account."
					subTitle="We'll email you a verification code."
					className="mb-16"
				/>
				<main>
					<Grid>
						<div className="col-span-full lg:col-span-6">
							{data.error ? (
								<div className="mb-8">
									<InputError id="signup-error">{data.error}</InputError>
								</div>
							) : null}
							{data.message ? (
								<p className="text-secondary mb-8 text-lg">{data.message}</p>
							) : null}

							<Form method="POST" noValidate className="mb-12">
								<input
									type="hidden"
									name="actionId"
									value={actionIds.requestCode}
								/>
								<Field
									name="email"
									label="Email"
									type="email"
									autoComplete="email"
									defaultValue={data.email}
								/>
								<Button type="submit">Email me a code</Button>
							</Form>

							{data.email.match(/.+@.+/) ? (
								<Form method="POST" noValidate className="mb-12">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.verifyCode}
									/>
									<input type="hidden" name="email" value={data.email} />
									{data.verificationId ? (
										<input
											type="hidden"
											name="verificationId"
											value={data.verificationId}
										/>
									) : null}
									<Field
										name="code"
										label="Verification code"
										type="text"
										autoComplete="one-time-code"
										placeholder="123456"
									/>
									<Button type="submit">Verify code</Button>
								</Form>
							) : null}

							<div className="flex flex-wrap gap-4">
								<ButtonLink to="/login" variant="secondary">
									Back to login
								</ButtonLink>
								<Form method="POST">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.cancel}
									/>
									<Button type="submit" variant="danger">
										Cancel
									</Button>
								</Form>
							</div>
						</div>
					</Grid>
				</main>
			</div>
		)
	}

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
						const password = formData.get('password')
						const confirmPassword = formData.get('confirmPassword')
						const selectedTeam =
							typeof team === 'string' && isTeam(team) ? team : undefined
						setFormValues({
							firstName: typeof firstName === 'string' ? firstName : '',
							team: selectedTeam,
							password: typeof password === 'string' ? password : '',
							confirmPassword:
								typeof confirmPassword === 'string' ? confirmPassword : '',
						})
					}}
				>
					<input type="hidden" name="actionId" value={actionIds.signUp} />
					<Grid>
						{data.error ? (
							<div className="col-span-full mb-8">
								<InputError id="signup-error">{data.error}</InputError>
							</div>
						) : null}
						{data.message ? (
							<p className="text-secondary col-span-full mb-8 text-lg">
								{data.message}
							</p>
						) : null}
						{actionData?.errors.generalError ? (
							<div className="col-span-full mb-4">
								<InputError id="general-error">
									{actionData.errors.generalError}
								</InputError>
							</div>
						) : null}
						{actionData?.errors.team ? (
							<div className="col-span-full mb-4 text-right">
								<InputError id="team-error">{actionData.errors.team}</InputError>
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

						<div className="col-span-full mb-12 lg:col-span-5 lg:mb-20">
							<Field
								name="password"
								label="Password"
								type="password"
								autoComplete="new-password"
								error={actionData?.errors.password}
							/>
						</div>
						<div className="col-span-full mb-12 lg:col-span-5 lg:col-start-7 lg:mb-20">
							<Field
								name="confirmPassword"
								label="Confirm password"
								type="password"
								autoComplete="new-password"
								error={actionData?.errors.confirmPassword}
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
