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
import { Paragraph } from '#app/components/typography.tsx'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getErrorMessage } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendPasswordResetEmail } from '#app/utils/send-email.server.ts'
import { getUser } from '#app/utils/session.server.ts'
import { prepareVerification, getVerifyUrl } from '#app/utils/verification.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await getUser(request)
	if (user) return redirect('/me')

	const loginSession = await getLoginInfoSession(request)

	const headers = new Headers({
		'Cache-Control': 'private, max-age=3600',
		Vary: 'Cookie',
	})
	await loginSession.getHeaders(headers)

	return json(
		{
			email: loginSession.getEmail(),
			error: loginSession.getError(),
		},
		{ headers },
	)
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const loginSession = await getLoginInfoSession(request)

	const emailAddress = formData.get('email')

	if (typeof emailAddress !== 'string' || !emailAddress) {
		return json({ error: 'Email is required' }, { status: 400 })
	}

	if (!emailAddress.match(/.+@.+/)) {
		return json({ error: 'A valid email is required' }, { status: 400 })
	}

	loginSession.setEmail(emailAddress)

	try {
		// Check if user exists (but don't reveal this information)
		const user = await prisma.user.findUnique({
			where: { email: emailAddress },
			select: { id: true, firstName: true },
		})

		// Always send a "success" message to prevent user enumeration
		// but only send an email if the user actually exists
		if (user) {
			const { verifyUrl, otp } = await prepareVerification({
				period: 600, // 10 minutes
				request,
				type: 'reset-password',
				target: emailAddress,
			})

			await sendPasswordResetEmail({
				emailAddress,
				verificationUrl: verifyUrl.toString(),
				verificationCode: otp,
				user,
			})
		}

		return json({
			success: true,
			message: `If an account with ${emailAddress} exists, we've sent a password reset email. Please check your inbox.`,
		})
	} catch (error: unknown) {
		console.error('Password reset error:', error)
		return json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export default function ForgotPassword() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const emailRef = React.useRef<HTMLInputElement>(null)

	const [email, setEmail] = React.useState(data.email ?? '')

	const formIsValid = email.match(/.+@.+/)

	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Forgot your password?"
				subTitle="Enter your email address and we'll send you a reset link."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						{actionData?.success ? (
							<div className="rounded-md bg-green-50 p-4">
								<div className="text-green-800">
									<h3 className="text-sm font-medium">Check your email</h3>
									<div className="mt-2 text-sm">
										<p>{actionData.message}</p>
									</div>
								</div>
							</div>
						) : (
							<Form
								method="POST"
								onChange={(e) => {
									const form = e.currentTarget
									setEmail(form.email.value)
								}}
							>
								<div className="mb-6">
									<Label htmlFor="email">Email Address</Label>
									<Input
										ref={emailRef}
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										placeholder="Enter your email address"
										defaultValue={email}
										autoFocus
										required
									/>
								</div>

								{actionData?.error ? (
									<div className="mb-6">
										<InputError id="form-error">{actionData.error}</InputError>
									</div>
								) : null}

								<div className="flex gap-4">
									<Button type="submit" disabled={!formIsValid}>
										Send Reset Email
									</Button>
									<Button variant="secondary" type="button" onClick={() => window.history.back()}>
										Back to Login
									</Button>
								</div>
							</Form>
						)}

						<div className="mt-8">
							<Paragraph className="text-sm text-gray-600">
								Don't have an account? You can{' '}
								<a href="/signup" className="underlined text-blue-600">
									create one here
								</a>
								.
							</Paragraph>
							<Paragraph className="mt-4 text-sm text-gray-600">
								Remember your password? Go back to{' '}
								<a href="/login" className="underlined text-blue-600">
									login
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