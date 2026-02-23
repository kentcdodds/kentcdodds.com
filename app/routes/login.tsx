import { invariantResponse } from '@epic-web/invariant'
import {
	WebAuthnAbortService,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
} from '@simplewebauthn/browser'
import { type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import {
	Form,
	Link,
	useNavigate,
	useRevalidator,
	data as json,
	redirect,
	type HeadersFunction,
	type MetaFunction,
} from 'react-router'
import { z } from 'zod'
import { Button, LinkButton } from '#app/components/button.tsx'
import { Input, InputError, Label } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { PasskeyIcon } from '#app/components/icons.js'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { getGenericSocialImage, images } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { getClientSession } from '#app/utils/client.server.ts'
import { ensurePrimary } from '#app/utils/litefs-js.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import {
	getDisplayUrl,
	getOrigin,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.ts'
import {
	DUMMY_PASSWORD_HASH,
	verifyPassword,
} from '#app/utils/password.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getSession, getUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/login'

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
			message: loginSession.getMessage(),
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
	invariantResponse(
		typeof emailAddress === 'string',
		'Form submitted incorrectly',
	)
	const email = emailAddress.trim().toLowerCase()

	const password = formData.get('password')
	invariantResponse(typeof password === 'string', 'Form submitted incorrectly')

	// honeypot
	const failedHoneypot = Boolean(formData.get('website'))
	if (failedHoneypot) {
		console.info(`FAILED HONEYPOT ON LOGIN`, {
			website: formData.get('website'),
		})
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	}

	if (email) loginSession.setEmail(email)

	if (!email.match(/.+@.+/)) {
		loginSession.flashError('A valid email is required')
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	}

	if (!password) {
		loginSession.flashError('Password is required')
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	}

	const userWithPassword = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			password: { select: { hash: true } },
		},
	})

	const passwordHash = userWithPassword?.password?.hash ?? DUMMY_PASSWORD_HASH
	const isValid = await verifyPassword({
		password,
		hash: passwordHash,
	})

	if (!userWithPassword?.password || !isValid) {
		loginSession.flashError(
			'Invalid email or password. If you do not have a password yet, use "Reset password" to set one.',
		)
		return redirect(`/login`, {
			headers: await loginSession.getHeaders(),
		})
	}

	const session = await getSession(request)
	await session.signIn({ id: userWithPassword.id })

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
					data: { userId: userWithPassword.id, clientId: null },
					where: { clientId },
				})
			}
		} catch (error) {
			console.error('Failed to migrate postReads on login', error)
		}
		clientSession.setUser({})
		await clientSession.getHeaders(headers)
	} catch (error) {
		console.error('Failed to read client session on login', error)
	}
	return redirect('/me', { headers })
}

const AuthenticationOptionsSchema = z.object({
	options: z.object({ challenge: z.string() }),
}) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

function Login({ loaderData: data }: Route.ComponentProps) {
	const inputRef = React.useRef<HTMLInputElement>(null)
	const passwordRef = React.useRef<HTMLInputElement>(null)
	const navigate = useNavigate()
	const { revalidate } = useRevalidator()
	const [error, setError] = React.useState<string>()
	const [passkeyMessage, setPasskeyMessage] = React.useState<null | string>(
		null,
	)
	const [passkeyAutofillSupported, setPasskeyAutofillSupported] =
		React.useState(false)

	const [formValues, setFormValues] = React.useState({
		email: data.email ?? '',
	})

	const formIsValid = formValues.email.match(/.+@.+/)

	React.useEffect(() => {
		let isMounted = true

		async function setupPasskeyAutofill() {
			try {
				const supports = await browserSupportsWebAuthnAutofill()
				if (!supports) return
				if (!isMounted) return
				setPasskeyAutofillSupported(true)

				// Fetch a challenge on page load and keep the request pending until
				// the user selects a passkey from the browser's autofill UI.
				const optionsResponse = await fetch(
					'/resources/webauthn/generate-authentication-options',
					{ method: 'POST' },
				)
				const json = await optionsResponse.json()
				const { options } = AuthenticationOptionsSchema.parse(json)

				const authResponse = await startAuthentication({
					optionsJSON: options,
					useBrowserAutofill: true,
				})

				if (!isMounted) return

				setPasskeyMessage('Verifying your passkey')

				const verificationResponse = await fetch(
					'/resources/webauthn/verify-authentication',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(authResponse),
					},
				)

				const verificationJson = (await verificationResponse.json()) as
					| { status: 'success' }
					| { status: 'error'; error: string }

				if (verificationJson.status === 'error') {
					throw new Error(verificationJson.error)
				}

				setPasskeyMessage('Welcome back! Navigating to your account page.')
				void revalidate()
				void navigate('/me')
			} catch (e) {
				if (!isMounted) return

				// Autofill flow should fail silently when the user cancels or chooses a
				// password instead.
				if (
					e instanceof Error &&
					(e.name === 'NotAllowedError' || e.name === 'AbortError')
				) {
					return
				}

				console.error(e)
			}
		}

		void setupPasskeyAutofill()

		return () => {
			isMounted = false
			WebAuthnAbortService.cancelCeremony()
		}
	}, [navigate, revalidate])

	async function handlePasskeyLogin() {
		try {
			setError(undefined)
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

			setPasskeyMessage('Welcome back! Navigating to your account page.')

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
							{passkeyAutofillSupported ? (
								<p className="text-secondary mt-2 text-sm">
									Tip: You can also sign in with a passkey from the email field
									autofill prompt.
								</p>
							) : null}
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
											autoComplete="username webauthn"
											defaultValue={formValues.email}
											required
											placeholder="Email address"
										/>
									</div>

									<div className="mb-6">
										<div className="mb-4 flex flex-wrap items-baseline justify-between">
											<Label htmlFor="password">Password</Label>
											<Link
												to="/forgot-password"
												prefetch="intent"
												className="underlined text-secondary text-sm focus:outline-none"
											>
												Reset password
											</Link>
										</div>
										<Input
											ref={passwordRef}
											id="password"
											name="password"
											type="password"
											autoComplete="current-password"
											required
											placeholder="Password"
										/>
									</div>

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

									<div className="flex flex-wrap gap-4">
										<Button type="submit">Log in</Button>
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
									<p className="text-secondary mt-4 text-sm">
										Need an account?{' '}
										<Link
											to="/signup"
											prefetch="intent"
											className="underlined focus:outline-none"
										>
											Create one
										</Link>
										.
									</p>

									<div className="sr-only" aria-live="polite">
										{formIsValid
											? 'Sign in form is now valid and ready to submit'
											: 'Sign in form is now invalid.'}
									</div>

									<div className="mt-2">
										{data.error ? (
											<InputError id="error-message">{data.error}</InputError>
										) : data.message ? (
											<p
												id="success-message"
												className="text-lg text-gray-500 dark:text-slate-500"
											>
												{data.message}
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
					To sign in to your account, use your email and password above (or use
					a passkey if you have set one up). If you do not have a password yet,
					use{' '}
					<Link
						to="/forgot-password"
						prefetch="intent"
						className="underlined focus:outline-none"
					>
						Reset password
					</Link>{' '}
					to set one.
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
