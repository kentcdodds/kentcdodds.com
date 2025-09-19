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
import { H2 } from '#app/components/typography.tsx'
import { getPasswordHash, checkIsCommonPassword } from '#app/utils/auth.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getErrorMessage } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSession } from '#app/utils/session.server.ts'
import { getPasswordValidationMessage } from '#app/utils/user-validation.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	)
	const verified = verifySession.get('verified')

	if (!verified || verified.type !== 'reset-password') {
		throw redirect('/login')
	}

	return json({ email: verified.target })
}

export async function action({ request }: ActionFunctionArgs) {
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	)
	const verified = verifySession.get('verified')

	if (!verified || verified.type !== 'reset-password') {
		return json({ error: 'Invalid or expired reset session' }, { status: 400 })
	}

	const formData = await request.formData()
	const password = formData.get('password')
	const confirmPassword = formData.get('confirmPassword')

	if (typeof password !== 'string' || !password) {
		return json({ error: 'Password is required' }, { status: 400 })
	}
	if (typeof confirmPassword !== 'string' || !confirmPassword) {
		return json({ error: 'Password confirmation is required' }, { status: 400 })
	}

	if (password !== confirmPassword) {
		return json({ error: 'Passwords do not match' }, { status: 400 })
	}

	const passwordError = getPasswordValidationMessage(password)
	if (passwordError) {
		return json({ error: passwordError }, { status: 400 })
	}

	try {
		// Check if password is common/compromised
		const isCommon = await checkIsCommonPassword(password)
		if (isCommon) {
			return json(
				{
					error:
						'This password has been found in a data breach. Please choose a stronger password.',
				},
				{ status: 400 },
			)
		}

		const hashedPassword = await getPasswordHash(password)
		const email = verified.target

		// Update or create password for user
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true },
		})

		if (!user) {
			return json({ error: 'User not found' }, { status: 400 })
		}

		await prisma.password.upsert({
			where: { userId: user.id },
			update: { hash: hashedPassword },
			create: { userId: user.id, hash: hashedPassword },
		})

		// Clean up verification session and login user
		const session = await getSession(request)
		await session.signIn(user)

		const headers = new Headers()
		await session.getHeaders(headers)
		headers.append(
			'Set-Cookie',
			await verifySessionStorage.destroySession(verifySession),
		)

		return redirect('/me', { headers })
	} catch (error: unknown) {
		return json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export default function ResetPassword() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const passwordRef = React.useRef<HTMLInputElement>(null)
	const confirmPasswordRef = React.useRef<HTMLInputElement>(null)

	const [formValues, setFormValues] = React.useState({
		password: '',
		confirmPassword: '',
	})

	const passwordError = getPasswordValidationMessage(formValues.password)
	const confirmPasswordError =
		formValues.confirmPassword &&
		formValues.password !== formValues.confirmPassword
			? 'Passwords do not match'
			: null

	const formIsValid =
		formValues.password &&
		formValues.confirmPassword &&
		!passwordError &&
		!confirmPasswordError

	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Reset your password"
				subTitle="Enter a new password for your account."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						<Form
							method="POST"
							onChange={(e) => {
								const form = e.currentTarget
								setFormValues({
									password: form.password.value,
									confirmPassword: form.confirmPassword.value,
								})
							}}
						>
							<div className="mb-6">
								<Label htmlFor="password">New Password</Label>
								<Input
									ref={passwordRef}
									id="password"
									name="password"
									type="password"
									autoComplete="new-password"
									placeholder="Enter new password"
									autoFocus
									required
								/>
								{passwordError && formValues.password ? (
									<InputError id="password-error">{passwordError}</InputError>
								) : null}
							</div>

							<div className="mb-6">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<Input
									ref={confirmPasswordRef}
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									autoComplete="new-password"
									placeholder="Confirm new password"
									required
								/>
								{confirmPasswordError ? (
									<InputError id="confirm-password-error">{confirmPasswordError}</InputError>
								) : null}
							</div>

							{actionData?.error ? (
								<div className="mb-6">
									<InputError id="form-error">{actionData.error}</InputError>
								</div>
							) : null}

							<Button type="submit" disabled={!formIsValid}>
								Reset Password
							</Button>
						</Form>

						<div className="mt-8">
							<H2 variant="secondary">Password Requirements</H2>
							<ul className="mt-4 space-y-2 text-sm text-gray-600">
								<li>• At least 6 characters long</li>
								<li>• Contains at least one uppercase letter</li>
								<li>• Contains at least one lowercase letter</li>
								<li>• Contains at least one number</li>
								<li>• Contains at least one special character</li>
								<li>• Not found in common password databases</li>
							</ul>
							<p className="mt-4 text-sm text-gray-600">
								Resetting password for: <strong>{data.email}</strong>
							</p>
						</div>
					</div>
				</Grid>
			</main>
		</div>
	)
}