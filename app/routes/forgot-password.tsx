import { invariantResponse } from '@epic-web/invariant'
import { data as json, redirect, Form, useLoaderData, type MetaFunction } from 'react-router'
import { Button, ButtonLink } from '#app/components/button.tsx'
import { Field, InputError } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { type KCDHandle } from '#app/types.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getDomainUrl } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendPasswordResetEmail } from '#app/utils/send-email.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { createVerification } from '#app/utils/verification.server.ts'
import { type Route } from './+types/forgot-password'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export const meta: MetaFunction<typeof loader> = () => {
	return [{ title: 'Forgot password' }]
}

export async function loader({ request }: Route.LoaderArgs) {
	const user = await getUser(request)
	if (user) return redirect('/me')

	const loginSession = await getLoginInfoSession(request)
	return json(
		{
			email: loginSession.getEmail() ?? '',
			error: loginSession.getError(),
			message: loginSession.getMessage(),
		},
		{ headers: await loginSession.getHeaders() },
	)
}

export async function action({ request }: Route.ActionArgs) {
	const loginSession = await getLoginInfoSession(request)
	const formData = await request.formData()

	const emailAddress = formData.get('email')
	invariantResponse(typeof emailAddress === 'string', 'Form submitted incorrectly')
	const email = emailAddress.toLowerCase()
	if (email) loginSession.setEmail(email)

	// honeypot
	const failedHoneypot = Boolean(formData.get('website'))
	if (failedHoneypot) {
		console.info(`FAILED HONEYPOT ON FORGOT PASSWORD`, {
			email,
			website: formData.get('website'),
		})
		return redirect('/forgot-password', {
			headers: await loginSession.getHeaders(),
		})
	}

	if (!email.match(/.+@.+/)) {
		loginSession.flashError('A valid email is required')
		return redirect('/forgot-password', {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}

	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true, team: true },
	})

	if (user) {
		const { verification, code } = await createVerification({
			type: 'PASSWORD_RESET',
			target: email,
		})

		const domainUrl = getDomainUrl(request)
		const verificationUrl = new URL('/reset-password', domainUrl)
		verificationUrl.searchParams.set('verification', verification.id)
		verificationUrl.searchParams.set('code', code)

		await sendPasswordResetEmail({
			emailAddress: email,
			verificationCode: code,
			verificationUrl: verificationUrl.toString(),
			domainUrl,
			team: user.team,
		})
	}

	// Avoid leaking whether an account exists for the email address.
	loginSession.flashMessage(
		'If an account exists for that email, you will receive a password reset email shortly.',
	)

	return redirect('/reset-password', { headers: await loginSession.getHeaders() })
}

export default function ForgotPassword() {
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Reset your password."
				subTitle="We'll email you a verification code."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						{data.error ? (
							<div className="mb-8">
								<InputError id="forgot-password-error">{data.error}</InputError>
							</div>
						) : null}
						{data.message ? (
							<p className="text-secondary mb-8 text-lg">{data.message}</p>
						) : null}

						<Form method="POST" noValidate>
							<Field
								name="email"
								label="Email"
								type="email"
								autoComplete="email"
								defaultValue={data.email}
							/>

							<div style={{ position: 'absolute', left: '-9999px' }}>
								<label htmlFor="website-field">Website</label>
								<input
									type="text"
									id="website-field"
									name="website"
									tabIndex={-1}
									autoComplete="off"
								/>
							</div>

							<Button type="submit">Email me a reset code</Button>
						</Form>
						<Spacer size="2xs" />
						<ButtonLink to="/login" variant="secondary">
							Back to login
						</ButtonLink>
					</div>
				</Grid>
			</main>
		</div>
	)
}

