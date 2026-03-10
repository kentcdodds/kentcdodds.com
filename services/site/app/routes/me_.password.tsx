import { data as json, redirect, Form } from 'react-router'
import { Button, ButtonLink } from '#app/components/button.tsx'
import { Field, InputError } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeaderSection } from '#app/components/sections/header-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { type KCDHandle } from '#app/types.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import {
	getPasswordHash,
	getPasswordStrengthError,
	verifyPassword,
} from '#app/utils/password.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSession, requireUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/me_.password'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

type ActionData =
	| {
			status: 'error'
			errors: {
				currentPassword?: string | null
				password?: string | null
				confirmPassword?: string | null
				generalError?: string | null
			}
	  }
	| { status: 'success'; errors: {} }

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const password = await prisma.password.findUnique({
		where: { userId: user.id },
		select: { userId: true },
	})
	return json({ hasPassword: Boolean(password) })
}

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()

	const currentPassword = formData.get('currentPassword')
	const password =
		typeof formData.get('password') === 'string'
			? String(formData.get('password'))
			: ''
	const confirmPassword =
		typeof formData.get('confirmPassword') === 'string'
			? String(formData.get('confirmPassword'))
			: ''

	const existingPassword = await prisma.password.findUnique({
		where: { userId: user.id },
		select: { hash: true },
	})

	if (existingPassword) {
		if (typeof currentPassword !== 'string' || !currentPassword) {
			return json<ActionData>(
				{
					status: 'error',
					errors: { currentPassword: 'Current password is required' },
				},
				400,
			)
		}
		const ok = await verifyPassword({
			password: currentPassword,
			hash: existingPassword.hash,
		})
		if (!ok) {
			return json<ActionData>(
				{
					status: 'error',
					errors: { currentPassword: 'Current password is incorrect' },
				},
				400,
			)
		}
	}

	const passwordError = await getPasswordStrengthError(password)
	const confirmPasswordError = (() => {
		if (!confirmPassword) return 'Confirm your password'
		if (confirmPassword !== password) return 'Passwords must match'
		return null
	})()

	if (passwordError || confirmPasswordError) {
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

	const passwordHash = await getPasswordHash(password)

	await ensurePrimary()
	await prisma.$transaction([
		prisma.password.upsert({
			where: { userId: user.id },
			update: { hash: passwordHash },
			create: { userId: user.id, hash: passwordHash },
		}),
		// Invalidate all sessions (including this one) after a password change.
		prisma.session.deleteMany({ where: { userId: user.id } }),
	])
	const session = await getSession(request)
	await session.signIn({ id: user.id })

	const headers = new Headers()
	await session.getHeaders(headers)
	return redirect(`/me?message=${encodeURIComponent('✅ Password updated')}`, {
		headers,
	})
}

export default function PasswordRoute({
	loaderData: data,
	actionData,
}: Route.ComponentProps) {
	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title={data.hasPassword ? 'Change your password.' : 'Set a password.'}
				subTitle="Passwords are used to log in on new devices."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						{actionData?.status === 'error' &&
						actionData.errors.generalError ? (
							<div className="mb-8">
								<InputError id="password-general-error">
									{actionData.errors.generalError}
								</InputError>
							</div>
						) : null}

						<Form method="POST" noValidate className="mb-8">
							{data.hasPassword ? (
								<Field
									name="currentPassword"
									label="Current password"
									type="password"
									autoComplete="current-password"
									error={
										actionData?.status === 'error'
											? actionData.errors.currentPassword
											: null
									}
								/>
							) : null}

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
							<Button type="submit">
								{data.hasPassword ? 'Update password' : 'Set password'}
							</Button>
						</Form>

						<ButtonLink to="/me" variant="secondary">
							Back to account
						</ButtonLink>
						<Spacer size="2xs" />
					</div>
				</Grid>
			</main>
		</div>
	)
}
