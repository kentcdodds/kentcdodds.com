import { invariantResponse } from '@epic-web/invariant'
import { data as json, redirect, Form, type MetaFunction } from 'react-router'
import { Button, ButtonLink } from '#app/components/button.tsx'
import { Field, InputError } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { type KCDHandle } from '#app/types.ts'
import { getClientSession } from '#app/utils/client.server.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { createAndSendPasswordResetVerificationEmail } from '#app/utils/password-reset.server.ts'
import {
	applyPasswordSubmissionDelay,
	getPasswordHash,
	getPasswordStrengthError,
} from '#app/utils/password.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSession, getUser } from '#app/utils/session.server.ts'
import {
	consumeVerification,
	consumeVerificationForTarget,
} from '#app/utils/verification.server.ts'
import { type Route } from './+types/reset-password'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export const meta: MetaFunction<typeof loader> = () => {
	return [{ title: 'Reset password' }]
}

type ActionData =
	| {
			status: 'error'
			errors: {
				email?: string | null
				code?: string | null
				password?: string | null
				confirmPassword?: string | null
				generalError?: string | null
			}
	  }
	| { status: 'success'; errors: {} }

const actionIds = {
	verify: 'verify',
	reset: 'reset',
	resend: 'resend',
	cancel: 'cancel',
} as const

export async function loader({ request }: Route.LoaderArgs) {
	const user = await getUser(request)
	if (user) return redirect('/me')

	const loginSession = await getLoginInfoSession(request)
	const url = new URL(request.url)
	const verificationId = url.searchParams.get('verification')
	const code = url.searchParams.get('code')

	// Support verification links in email.
	if (verificationId && code) {
		const result = await consumeVerification({
			id: verificationId,
			code,
			type: 'PASSWORD_RESET',
		})
		if (result) {
			loginSession.setResetPasswordEmail(result.target)
			loginSession.setEmail(result.target)
			loginSession.flashMessage('Verification successful. Choose a password.')
			return redirect('/reset-password', {
				headers: await loginSession.getHeaders(),
			})
		}
		loginSession.flashError(
			'Verification link invalid or expired. Please request a new one.',
		)
		return redirect('/reset-password', {
			headers: await loginSession.getHeaders(),
		})
	}

	const resetEmail = loginSession.getResetPasswordEmail()
	let hasPassword: boolean | null = null
	if (resetEmail) {
		const userRecord = await prisma.user.findUnique({
			where: { email: resetEmail },
			select: { password: { select: { userId: true } } },
		})
		hasPassword = Boolean(userRecord?.password)
	}
	return json(
		{
			step: resetEmail ? 'set-password' : 'verify',
			email: resetEmail ?? loginSession.getEmail() ?? '',
			error: loginSession.getError(),
			message: loginSession.getMessage(),
			hasPassword,
		} as const,
		{ headers: await loginSession.getHeaders() },
	)
}

export async function action({ request }: Route.ActionArgs) {
	const loginSession = await getLoginInfoSession(request)
	const formData = await request.formData()
	const actionId = formData.get('actionId')

	if (actionId === actionIds.cancel) {
		loginSession.clean()
		return redirect('/login', { headers: await loginSession.getHeaders() })
	}

	if (actionId === actionIds.resend) {
		const emailAddress = formData.get('email')
		invariantResponse(
			typeof emailAddress === 'string',
			'Form submitted incorrectly',
		)
		const email = emailAddress.trim().toLowerCase()
		if (email) loginSession.setEmail(email)

		if (!email.match(/.+@.+/)) {
			loginSession.flashError('A valid email is required')
			return redirect('/reset-password', {
				headers: await loginSession.getHeaders(),
			})
		}

		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, team: true },
		})
		if (user) {
			await createAndSendPasswordResetVerificationEmail({
				emailAddress: email,
				team: user.team,
				request,
			})
		}

		loginSession.flashMessage(
			'If an account exists for that email, you will receive a password reset email shortly.',
		)
		return redirect('/reset-password', {
			headers: await loginSession.getHeaders(),
		})
	}

	if (actionId === actionIds.verify) {
		const emailAddress = formData.get('email')
		const code = formData.get('code')
		invariantResponse(
			typeof emailAddress === 'string',
			'Form submitted incorrectly',
		)
		invariantResponse(typeof code === 'string', 'Form submitted incorrectly')
		const email = emailAddress.trim().toLowerCase()
		if (email) loginSession.setEmail(email)

		if (!email.match(/.+@.+/)) {
			return json<ActionData>(
				{ status: 'error', errors: { email: 'A valid email is required' } },
				400,
			)
		}
		if (!code) {
			return json<ActionData>(
				{ status: 'error', errors: { code: 'Verification code is required' } },
				400,
			)
		}

		const result = await consumeVerificationForTarget({
			target: email,
			code,
			type: 'PASSWORD_RESET',
		})

		if (!result) {
			return json<ActionData>(
				{
					status: 'error',
					errors: {
						generalError:
							'Verification code invalid or expired. Please request a new one.',
					},
				},
				400,
			)
		}

		loginSession.setResetPasswordEmail(result.target)
		loginSession.setEmail(result.target)
		loginSession.flashMessage('Verification successful. Choose a password.')
		return redirect('/reset-password', {
			headers: await loginSession.getHeaders(),
		})
	}

	// Password set/reset step
	const resetEmail = loginSession.getResetPasswordEmail()
	if (!resetEmail) {
		loginSession.flashError('Verify your email before resetting your password.')
		return redirect('/reset-password', {
			headers: await loginSession.getHeaders(),
		})
	}
	if (actionId !== actionIds.reset) {
		loginSession.flashError('Something went wrong. Please try again.')
		return redirect('/reset-password', {
			headers: await loginSession.getHeaders(),
		})
	}

	const passwordEntry = formData.get('password')
	const password = typeof passwordEntry === 'string' ? passwordEntry : ''
	const confirmPassword =
		typeof formData.get('confirmPassword') === 'string'
			? String(formData.get('confirmPassword'))
			: ''

	const passwordError = await getPasswordStrengthError(password)
	const confirmPasswordError = (() => {
		if (!confirmPassword) return 'Confirm your password'
		if (confirmPassword !== password) return 'Passwords must match'
		return null
	})()

	if (passwordError || confirmPasswordError) {
		await applyPasswordSubmissionDelay()
		return json<ActionData>(
			{
				status: 'error',
				errors: {
					password: passwordError,
					confirmPassword: confirmPasswordError,
				},
			},
			400,
		)
	}

	const userRecord = await prisma.user.findUnique({
		where: { email: resetEmail },
		select: { id: true },
	})

	if (!userRecord) {
		loginSession.clean()
		loginSession.flashError(
			'No account found for that email. Create one instead.',
		)
		await applyPasswordSubmissionDelay()
		return redirect('/signup', { headers: await loginSession.getHeaders() })
	}

	const passwordHash = await getPasswordHash(password)

	await ensurePrimary()
	await prisma.$transaction([
		prisma.password.upsert({
			where: { userId: userRecord.id },
			update: { hash: passwordHash },
			create: { userId: userRecord.id, hash: passwordHash },
		}),
		// Sign out everywhere on password reset.
		prisma.session.deleteMany({ where: { userId: userRecord.id } }),
	])

	const session = await getSession(request)
	await session.signIn({ id: userRecord.id })

	const headers = new Headers()
	loginSession.clean()
	await loginSession.getHeaders(headers)
	await session.getHeaders(headers)
	try {
		const clientSession = await getClientSession(request, null)
		try {
			const clientId = clientSession.getClientId()
			if (clientId) {
				await ensurePrimary()
				await prisma.postRead.updateMany({
					data: { userId: userRecord.id, clientId: null },
					where: { clientId },
				})
			}
		} catch (error) {
			console.error('Failed to migrate postReads on password reset', error)
		}
		clientSession.setUser({})
		await clientSession.getHeaders(headers)
	} catch (error) {
		console.error('Failed to read client session on password reset', error)
	}
	await applyPasswordSubmissionDelay()
	return redirect('/me', { headers })
}

export default function ResetPassword({
	loaderData: data,
	actionData,
}: Route.ComponentProps) {
	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title={
					data.step === 'verify'
						? 'Set or reset your password.'
						: data.hasPassword
							? 'Choose a new password.'
							: 'Choose a password.'
				}
				subTitle={
					data.step === 'verify'
						? 'Use the code from your email.'
						: data.hasPassword
							? 'Choose a new password.'
							: 'Choose a password.'
				}
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						{data.error ? (
							<div className="mb-8">
								<InputError id="reset-password-error">{data.error}</InputError>
							</div>
						) : null}
						{actionData?.status === 'error' &&
						actionData.errors.generalError ? (
							<div className="mb-8">
								<InputError id="reset-password-general-error">
									{actionData.errors.generalError}
								</InputError>
							</div>
						) : null}
						{data.message ? (
							<p className="text-secondary mb-8 text-lg">{data.message}</p>
						) : null}

						{data.step === 'verify' ? (
							<>
								<Form method="POST" noValidate className="mb-8">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.verify}
									/>
									<Field
										name="email"
										label="Email"
										type="email"
										autoComplete="email"
										defaultValue={data.email}
										error={
											actionData?.status === 'error'
												? actionData.errors.email
												: null
										}
									/>
									<Field
										name="code"
										label="Verification code"
										type="text"
										autoComplete="one-time-code"
										placeholder="123456"
										error={
											actionData?.status === 'error'
												? actionData.errors.code
												: null
										}
									/>
									<Button type="submit">Verify code</Button>
								</Form>

								<Form method="POST" noValidate className="mb-8">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.resend}
									/>
									<input type="hidden" name="email" value={data.email} />
									<Button type="submit" variant="secondary">
										Resend email
									</Button>
								</Form>

								<ButtonLink to="/forgot-password" variant="secondary">
									Back
								</ButtonLink>
							</>
						) : (
							<>
								<Form method="POST" noValidate className="mb-8">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.reset}
									/>
									<Field
										name="password"
										label="New password"
										type="password"
										autoComplete="new-password"
										error={
											actionData?.status === 'error'
												? actionData.errors.password
												: null
										}
									/>
									<Field
										name="confirmPassword"
										label="Confirm password"
										type="password"
										autoComplete="new-password"
										error={
											actionData?.status === 'error'
												? actionData.errors.confirmPassword
												: null
										}
									/>
									<Button type="submit">Set new password</Button>
								</Form>

								<Form method="POST">
									<input
										type="hidden"
										name="actionId"
										value={actionIds.cancel}
									/>
									<Button type="submit" variant="secondary">
										Cancel
									</Button>
								</Form>
							</>
						)}
						<Spacer size="2xs" />
					</div>
				</Grid>
			</main>
		</div>
	)
}
