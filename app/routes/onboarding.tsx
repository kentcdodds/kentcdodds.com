import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import * as React from 'react'
import { Button } from '#app/components/button.tsx'
import { Input, InputError, Label } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { H2, Paragraph } from '#app/components/typography.tsx'
import { getErrorMessage, getDomainUrl } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { createPasswordForUser } from '#app/utils/auth.server.ts'
import { validatePassword } from '#app/utils/user-validation.ts'
import { requireUser, getUser } from '#app/utils/session.server.ts'
import { prepareVerification } from '#app/utils/verification.server.ts'
import { isEmailVerified } from '#app/utils/verifier.server.ts'
import { sendPasswordResetEmail } from '#app/utils/send-email.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const email = formData.get('email')

	if (typeof email !== 'string' || !email) {
		return json({ error: 'Email is required' }, { status: 400 })
	}

	if (!email.match(/.+@.+/)) {
		return json({ error: 'Please enter a valid email address' }, { status: 400 })
	}

	try {
		// Verify email is in mailing list first
		const verifiedStatus = await isEmailVerified(email)
		if (!verifiedStatus.verified) {
			return json(
				{
					error: `I tried to verify that email and got this error message: "${verifiedStatus.message}". If you think this is wrong, sign up for Kent's mailing list first (using the form on the bottom of the page) and once that's confirmed you'll be able to sign up.`,
				},
				{ status: 400 },
			)
		}
	} catch (error: unknown) {
		console.error(`There was an error verifying an email address:`, error)
		// Continue on... This was probably our fault...
	}

	// Check if user exists
	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { id: true, firstName: true, password: { select: { hash: true } } },
	})

	if (!existingUser) {
		// For new users, send them to verification -> signup flow
		try {
			const { verifyUrl } = await prepareVerification({
				period: 600, // 10 minutes
				request,
				type: 'onboarding',
				target: email,
			})

			await sendPasswordResetEmail({
				emailAddress: email,
				verificationUrl: verifyUrl.toString(),
				verificationCode: '000000', // Not used for onboarding
				user: null,
			})

			return json({
				success: `We sent a verification email to ${email}. Click the link in the email to continue setting up your account.`,
			})
		} catch (error: unknown) {
			console.error('Error sending onboarding email:', error)
			return json(
				{ error: 'Failed to send verification email. Please try again.' },
				{ status: 500 },
			)
		}
	}

	if (existingUser.password?.hash) {
		// User already has a password, redirect to login
		return json({
			error:
				'You already have an account with a password. Please use the login page to sign in.',
		})
	}

	// Existing user without password - send password setup email
	try {
		const { verifyUrl } = await prepareVerification({
			period: 600, // 10 minutes
			request,
			type: 'reset-password',
			target: email,
		})

		await sendPasswordResetEmail({
			emailAddress: email,
			verificationUrl: verifyUrl.toString(),
			verificationCode: '000000', // Not used for this flow
			user: { firstName: existingUser.firstName },
		})

		return json({
			success: `We sent a password setup email to ${email}. Click the link in the email to set up your password.`,
		})
	} catch (error: unknown) {
		console.error('Error sending password setup email:', error)
		return json(
			{ error: 'Failed to send password setup email. Please try again.' },
			{ status: 500 },
		)
	}
}

export default function Onboarding() {
	const actionData = useActionData<typeof action>()
	const [email, setEmail] = React.useState('')
	const emailRef = React.useRef<HTMLInputElement>(null)

	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Set up your password"
				subTitle="We're moving from magic links to passwords for better reliability."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-8">
						<div className="mb-8">
							<H2 className="mb-4">What's changing?</H2>
							<Paragraph className="mb-4">
								We're updating our authentication system to use passwords instead
								of magic links for improved reliability. If you already have an
								account, we'll help you set up a password.
							</Paragraph>
							<Paragraph className="mb-4">
								Enter your email below and we'll send you a link to:
							</Paragraph>
							<ul className="mb-8 ml-6 list-disc space-y-2">
								<li>Set up a password if you're an existing user</li>
								<li>Create a new account if you're new</li>
							</ul>
						</div>

						<Form method="POST">
							<div className="mb-6">
								<Label htmlFor="email">Email Address</Label>
								<Input
									ref={emailRef}
									id="email"
									name="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email address"
									autoComplete="email"
									autoFocus
									required
								/>
								{actionData && 'error' in actionData ? (
									<InputError id="email-error">{actionData.error}</InputError>
								) : null}
								{actionData && 'success' in actionData ? (
									<div className="mt-2 text-green-600">{actionData.success}</div>
								) : null}
							</div>

							<Button type="submit" disabled={!email.match(/.+@.+/)}>
								Continue
							</Button>
						</Form>

						<div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<H2 variant="secondary" className="mb-2 text-yellow-800">
								Already have a password?
							</H2>
							<Paragraph className="text-yellow-700">
								If you've already set up a password, you can{' '}
								<a href="/login" className="underline">
									go directly to the login page
								</a>
								.
							</Paragraph>
						</div>
					</div>
				</Grid>
			</main>
		</div>
	)
}