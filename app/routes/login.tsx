import {
	json,
	redirect,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	useLoaderData,
	useNavigate,
	useRevalidator,
} from '@remix-run/react'
import { startAuthentication } from '@simplewebauthn/browser'
import { type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { Button, LinkButton } from '#app/components/button.tsx'
import { Input, InputError, Label } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { PasskeyIcon } from '#app/components/icons.js'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Paragraph, H2 } from '#app/components/typography.tsx'
import { getGenericSocialImage, images } from '#app/images.tsx'
import { type RootLoaderType } from '#app/root.tsx'
import { loginWithPassword } from '#app/utils/auth.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import {
	getDisplayUrl,
	getDomainUrl,
	getErrorMessage,
	getOrigin,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendPasswordResetEmail } from '#app/utils/send-email.server.ts'
import { getSocialMetas } from '#app/utils/seo.ts'
import { getUser, sendToken, getSession } from '#app/utils/session.server.ts'
import { prepareVerification } from '#app/utils/verification.server.ts'
import { isEmailVerified } from '#app/utils/verifier.server.ts'

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

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const loginSession = await getLoginInfoSession(request)

	const emailAddress = formData.get('email')
	const password = formData.get('password')
	const intent = formData.get('intent')

	invariant(typeof emailAddress === 'string', 'Form submitted incorrectly')
	if (emailAddress) loginSession.setEmail(emailAddress)

	if (!emailAddress.match(/.+@.+/)) {
		loginSession.flashError('A valid email is required')
		return redirect(`/login`, {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}

	// Handle password login
	if (intent === 'password-login' && typeof password === 'string') {
		if (!password) {
			loginSession.flashError('Password is required')
			return redirect(`/login`, {
				status: 400,
				headers: await loginSession.getHeaders(),
			})
		}

		try {
			// Check if user exists
			const existingUser = await prisma.user.findUnique({
				where: { email: emailAddress },
				select: { id: true, password: { select: { hash: true } } },
			})

			if (!existingUser) {
				loginSession.flashError('No account found with that email address')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			if (!existingUser.password?.hash) {
				loginSession.flashError(
					'This account does not have a password set up yet. Please use "Forgot password?" to set one up.',
				)
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			const user = await loginWithPassword({ email: emailAddress, password })
			if (!user) {
				loginSession.flashError('Invalid email or password')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			const session = await getSession(request)
			await session.signIn({ id: user.user.id })
			loginSession.clean()

			const headers = new Headers()
			await session.getHeaders(headers)
			await loginSession.getHeaders(headers)

			return redirect('/me', { headers })
		} catch (e: unknown) {
			loginSession.flashError(getErrorMessage(e) || 'Login failed')
			return redirect(`/login`, {
				status: 400,
				headers: await loginSession.getHeaders(),
			})
		}
	}

	// Handle password reset request
	if (intent === 'reset-password') {
		try {
			const user = await prisma.user.findUnique({
				where: { email: emailAddress },
				select: { id: true, firstName: true },
			})

			if (user) {
				const { verifyUrl } = await prepareVerification({
					period: 600, // 10 minutes
					request,
					type: 'reset-password',
					target: emailAddress,
				})

				await sendPasswordResetEmail({
					emailAddress,
					resetLink: verifyUrl.toString(),
					user,
					domainUrl: getDomainUrl(request),
				})
			} else {
				// New user - send them to onboarding
				try {
					const verifiedStatus = await isEmailVerified(emailAddress)
					if (verifiedStatus.verified) {
						const { verifyUrl } = await prepareVerification({
							period: 600, // 10 minutes
							request,
							type: 'onboarding',
							target: emailAddress,
						})

						await sendPasswordResetEmail({
							emailAddress,
							resetLink: verifyUrl.toString(),
							user: null,
							domainUrl: getDomainUrl(request),
						})
					}
				} catch (error: unknown) {
					console.error('Error with email verification:', error)
				}
			}

			// Always show success message to prevent user enumeration
			loginSession.flashError(
				'If an account with that email exists, we sent you a password reset link. New users will get a link to create an account.',
			)
			return redirect(`/login`, {
				headers: await loginSession.getHeaders(),
			})
		} catch (e: unknown) {
			loginSession.flashError(getErrorMessage(e) || 'Password reset failed')
			return redirect(`/login`, {
				status: 400,
				headers: await loginSession.getHeaders(),
			})
		}
	}

	// Legacy magic link flow (to be deprecated)
	// this is our honeypot. Our login is passwordless.
	const failedHoneypot = Boolean(formData.get('honey'))
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
	const data = useLoaderData<typeof loader>()
	const inputRef = React.useRef<HTMLInputElement>(null)
	const navigate = useNavigate()
	const { revalidate } = useRevalidator()
	const [error, setError] = React.useState<string>()
	const [passkeyMessage, setPasskeyMessage] = React.useState<null | string>(
		null,
	)
	const [loginMode, setLoginMode] = React.useState<'password' | 'magic-link'>(
		'password',
	)

	const [formValues, setFormValues] = React.useState({
		email: data.email ?? '',
		password: '',
	})

	const formIsValid =
		formValues.email.match(/.+@.+/) &&
		(loginMode === 'magic-link' || formValues.password.length > 0)

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

			revalidate()
			navigate('/me')
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
											Or continue with email and password
										</span>
									</div>
								</div>

								<div className="mb-4 flex flex-wrap gap-2">
									<Button
										variant={loginMode === 'password' ? 'primary' : 'secondary'}
										size="sm"
										onClick={() => setLoginMode('password')}
										type="button"
									>
										Password
									</Button>
									<Button
										variant={
											loginMode === 'magic-link' ? 'primary' : 'secondary'
										}
										size="sm"
										onClick={() => setLoginMode('magic-link')}
										type="button"
									>
										Magic Link
									</Button>
								</div>

								<Form
									onChange={(event) => {
										const form = event.currentTarget
										setFormValues({
											email: form.email.value,
											password: form.password?.value || '',
										})
									}}
									action="/login"
									method="POST"
									className="mb-10 lg:mb-12"
								>
									<input
										type="hidden"
										name="intent"
										value={
											loginMode === 'password'
												? 'password-login'
												: 'magic-link'
										}
									/>

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

									{loginMode === 'password' ? (
										<div className="mb-6">
											<div className="mb-4 flex flex-wrap items-baseline justify-between">
												<Label htmlFor="password">Password</Label>
												<Form method="POST" className="inline">
													<input
														type="hidden"
														name="intent"
														value="reset-password"
													/>
													<input
														type="hidden"
														name="email"
														value={formValues.email}
													/>
													<Button
														variant="secondary"
														size="sm"
														type="submit"
														disabled={!formValues.email.match(/.+@.+/)}
													>
														Forgot password?
													</Button>
												</Form>
											</div>

											<Input
												id="password"
												name="password"
												type="password"
												autoComplete="current-password"
												defaultValue={formValues.password}
												required={loginMode === 'password'}
												placeholder="Password"
											/>
										</div>
									) : null}

									<div style={{ position: 'absolute', left: '-9999px' }}>
										<label htmlFor="honey">Honey</label>
										<input
											type="password"
											id="honey"
											name="honey"
											tabIndex={-1}
											autoComplete="nope"
										/>
									</div>

									<div className="flex flex-wrap gap-4">
										<Button type="submit" disabled={!formIsValid}>
											{loginMode === 'password'
												? 'Sign in'
												: 'Email a login link'}
										</Button>
										<LinkButton
											type="reset"
											onClick={() => {
												setFormValues({ email: '', password: '' })
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
										) : data.email && loginMode === 'magic-link' ? (
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
              To sign in to your account, you can use your password, request a magic link, or use a passkey.
              If you don't have a password yet, use "Forgot password?" to set one up.
            `}
				</Paragraph>
				
				<div className="col-span-full mb-10 md:col-span-4">
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<H2 variant="secondary" className="mb-2 text-blue-800">
							New to passwords?
						</H2>
						<Paragraph className="text-blue-700">
							We're transitioning from magic links to passwords for better reliability.{' '}
							<a href="/onboarding" className="underline font-medium">
								Click here for help setting up your password
							</a>
							.
						</Paragraph>
					</div>
				</div>

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
