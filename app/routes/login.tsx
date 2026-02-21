import { invariantResponse } from '@epic-web/invariant'
import { startAuthentication } from '@simplewebauthn/browser'
import { type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import { Form, useLoaderData, useNavigate, useRevalidator, data as json, redirect, type HeadersFunction, type MetaFunction } from 'react-router';
import { z } from 'zod'
import { Button, LinkButton } from '#app/components/button.tsx'
import { Input, InputError, Label } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { PasskeyIcon } from '#app/components/icons.js'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { getGenericSocialImage, images } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import {
	getDisplayUrl,
	getDomainUrl,
	getErrorMessage,
	getOrigin,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getUser, sendToken } from '#app/utils/session.server.ts'
import { isEmailVerified } from '#app/utils/verifier.server.ts'
import  { type Route } from './+types/login'

export async function loader({ request }: Route.LoaderArgs) {
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

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction<typeof loader, { root: RootLoaderType }> = ({
	matches,
}) => {
	const requestInfo = matches.find((m) => m.id === 'root')?.data.requestInfo
	const domain = new URL(getOrigin(requestInfo)).host
	return getSocialMetas({
		title: `Login to ${domain}`,
		description: `Sign up or login to ${domain} to join a team and learn together.`,
		url: getUrl(requestInfo),
		image: getGenericSocialImage({
			url: getDisplayUrl(requestInfo),
			featuredImage: images.skis.id,
			words: `Login to your account on ${domain}`,
		}),
	})
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const loginSession = await getLoginInfoSession(request)

	const emailAddress = formData.get('email')
	invariantResponse(typeof emailAddress === 'string', 'Form submitted incorrectly')
	if (emailAddress) loginSession.setEmail(emailAddress)

	if (!emailAddress.match(/.+@.+/)) {
		loginSession.flashError('A valid email is required')
		return redirect(`/login`, {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}

	// this is our honeypot. Our login is passwordless.
	const failedHoneypot = Boolean(formData.get('password'))
	if (failedHoneypot) {
		console.info(
			`FAILED HONEYPOT ON LOGIN`,
			Object.fromEntries(formData.entries()),
		)
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	}

	try {
		const verifiedStatus = await isEmailVerified(emailAddress)
		if (!verifiedStatus.verified) {
			const errorMessage = `I tried to verify that email and got this error message: "${verifiedStatus.message}". If you think this is wrong, sign up for Kent's mailing list first (using the form on the bottom of the page) and once that's confirmed you'll be able to sign up.`
			loginSession.flashError(errorMessage)
			return redirect(`/login`, {
				status: 400,
				headers: await loginSession.getHeaders(),
			})
		}
	} catch (error: unknown) {
		console.error(`There was an error verifying an email address:`, error)
		// continue on... This was probably our fault...
		// IDEA: notify me of this issue...
	}

	try {
		const domainUrl = getDomainUrl(request)
		const magicLink = await sendToken({ emailAddress, domainUrl })
		loginSession.setMagicLink(magicLink)
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	} catch (e: unknown) {
		loginSession.flashError(getErrorMessage(e))
		return redirect(`/login`, {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}
}

const AuthenticationOptionsSchema = z.object({
	options: z.object({ challenge: z.string() }),
}) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

function Login() {
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	const inputRef = React.useRef<HTMLInputElement>(null)
	const navigate = useNavigate()
	const { revalidate } = useRevalidator()
	const [error, setError] = React.useState<string>()
	const [passkeyMessage, setPasskeyMessage] = React.useState<null | string>(
		null,
	)

	const [formValues, setFormValues] = React.useState({
		email: data.email ?? '',
	})

	const formIsValid = formValues.email.match(/.+@.+/)

	async function handlePasskeyLogin() {
		try {
			setPasskeyMessage('Generating Authentication Options')
			// Get authentication options from the server
			const optionsResponse = await fetch(
				'/resources/webauthn/generate-authentication-options',
				{ method: 'POST' },
			)
			const json = await optionsResponse.json()
			const { options } = AuthenticationOptionsSchema.parse(json)

			setPasskeyMessage('Requesting your authorization')
			const authResponse = await startAuthentication({ optionsJSON: options })
			setPasskeyMessage('Verifying your passkey')

			// Verify the authentication with the server
			const verificationResponse = await fetch(
				'/resources/webauthn/verify-authentication',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(authResponse),
				},
			)

			const verificationJson = (await verificationResponse.json()) as {
				status: 'error'
				error: string
			}
			if (verificationJson.status === 'error') {
				throw new Error(verificationJson.error)
			}

			setPasskeyMessage("You're logged in! Navigating to your account page.")

			void revalidate()
			void navigate('/me')
		} catch (e) {
			setPasskeyMessage(null)
			console.error(e)
			setError(
				e instanceof Error ? e.message : 'Failed to authenticate with passkey',
			)
		}
	}

	return (
		<>
			<HeroSection
				imageBuilder={images.skis}
				imageSize="medium"
				title="Log in to your account."
				subtitle="Or sign up for an account."
				action={
					<main>
						<div className="mb-8">
							<Button
								onClick={handlePasskeyLogin}
								id="passkey-login-button"
								type="submit"
								className="w-full justify-center"
							>
								Login with Passkey <PasskeyIcon />
							</Button>
							{error ? (
								<div className="mt-2">
									<InputError id="passkey-login-error">{error}</InputError>
								</div>
							) : null}
						</div>

						<div className="relative">
							<div
								className={clsx(
									'transition-opacity duration-200',
									passkeyMessage ? 'opacity-0' : 'opacity-100',
								)}
								{...(passkeyMessage ? { inert: true } : {})}
							>
								<div className="relative mb-8">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-gray-300" />
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="bg-white px-2 text-gray-500">
											Or continue with email
										</span>
									</div>
								</div>

								<Form
									onChange={(event) => {
										const form = event.currentTarget
										setFormValues({ email: form.email.value })
									}}
									action="/login"
									method="POST"
									className="mb-10 lg:mb-12"
								>
									<div className="mb-6">
										<div className="mb-4 flex flex-wrap items-baseline justify-between">
											<Label htmlFor="email-address">Email address</Label>
										</div>

										<Input
											ref={inputRef}
											autoFocus
											aria-describedby={
												data.error ? 'error-message' : 'success-message'
											}
											id="email-address"
											name="email"
											type="email"
											autoComplete="email"
											defaultValue={formValues.email}
											required
											placeholder="Email address"
										/>
									</div>

									<div style={{ position: 'absolute', left: '-9999px' }}>
										<label htmlFor="password-field">Password</label>
										<input
											type="password"
											id="password-field"
											name="password"
											tabIndex={-1}
											autoComplete="nope"
										/>
									</div>

									<div className="flex flex-wrap gap-4">
										<Button type="submit">Email a login link</Button>
										<LinkButton
											type="reset"
											onClick={() => {
												setFormValues({ email: '' })
												inputRef.current?.focus()
											}}
										>
											Reset
										</LinkButton>
									</div>

									<div className="sr-only" aria-live="polite">
										{formIsValid
											? 'Sign in form is now valid and ready to submit'
											: 'Sign in form is now invalid.'}
									</div>

									<div className="mt-2">
										{data.error ? (
											<InputError id="error-message">{data.error}</InputError>
										) : data.email ? (
											<p
												id="success-message"
												className="text-lg text-gray-500 dark:text-slate-500"
											>
												{`✨ A magic link has been sent to ${data.email}.`}
											</p>
										) : null}
									</div>
								</Form>
							</div>

							<AnimatePresence>
								{passkeyMessage ? (
									<motion.div
										className="absolute inset-0 flex items-center justify-center"
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -10 }}
										transition={{ duration: 0.2 }}
									>
										<AnimatePresence mode="wait" initial={false}>
											<motion.div
												key={passkeyMessage}
												className="text-center text-lg"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.15 }}
												aria-live="polite"
											>
												{passkeyMessage}
											</motion.div>
										</AnimatePresence>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>
					</main>
				}
			/>
			<Grid>
				<Paragraph className="col-span-full mb-10 md:col-span-4">
					{`
              To sign in to your account or to create a new one fill in your
              email above and we'll send you an email with a magic link to get
              you started.
            `}
				</Paragraph>

				<Paragraph
					className="col-span-full mb-10 text-sm md:col-span-4 lg:col-start-7"
					prose={false}
				>
					{`Tip: this account is a completely different account from your `}
					<a
						href="https://testingjavascript.com"
						className="underlined text-yellow-500"
						target="_blank"
						rel="noreferrer noopener"
					>
						TestingJavaScript.com
					</a>
					{`, `}
					<a
						href="https://epicreact.dev"
						className="underlined text-blue-500"
						target="_blank"
						rel="noreferrer noopener"
					>
						EpicReact.dev
					</a>
					{`, and `}
					<a
						href="https://epicweb.dev"
						className="underlined text-red-500"
						target="_blank"
						rel="noreferrer noopener"
					>
						EpicWeb.dev
					</a>
					{`
            accounts, but I recommend you use the same email address for all of
            them because they all feed into my mailing list.
          `}
				</Paragraph>
			</Grid>
		</>
	)
}

export default Login
