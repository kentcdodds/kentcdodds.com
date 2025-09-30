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
	useActionData,
} from '@remix-run/react'
import { startAuthentication } from '@simplewebauthn/browser'
import { type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import * as React from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { Button, LinkButton } from '#app/components/button'
import { Input, InputError, Label } from '#app/components/form-elements'
import { Grid } from '#app/components/grid'
import { PasskeyIcon } from '#app/components/icons'
import { HeroSection } from '#app/components/sections/hero-section'
import { Paragraph } from '#app/components/typography'
import { getGenericSocialImage, images } from '#app/images'
import { type RootLoaderType } from '#app/root'
import { loginWithPassword, signupWithPassword } from '#app/utils/auth.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server'
import {
	getDisplayUrl,
	getDomainUrl,
	getErrorMessage,
	getOrigin,
	getUrl,
	reuseUsefulLoaderHeaders,
} from '#app/utils/misc'
import { getSocialMetas } from '#app/utils/seo'
import { getUser, getSession } from '#app/utils/session.server'
import { validatePassword } from '#app/utils/user-validation.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { sendPasswordResetEmail } from '#app/utils/send-email.server.ts'
import { prepareVerification } from '#app/utils/verification.server.ts'

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
	const intent = formData.get('intent')

	const emailAddress = formData.get('email')
	const password = formData.get('password')
	const confirmPassword = formData.get('confirmPassword')
	const firstName = formData.get('firstName')
	const lastName = formData.get('lastName')

	invariant(typeof emailAddress === 'string', 'Form submitted incorrectly')
	if (emailAddress) loginSession.setEmail(emailAddress)

	if (!emailAddress.match(/.+@.+/)) {
		loginSession.flashError('A valid email is required')
		return redirect(`/login`, {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}

	try {
		if (intent === 'signin') {
			if (typeof password !== 'string' || password.length === 0) {
				loginSession.flashError('Password is required')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			const result = await loginWithPassword({ email: emailAddress, password })
			if (result?.user) {
				const session = await getSession(request)
				await session.signIn(result.user)
				
				const headers = new Headers()
				await session.getHeaders(headers)
				await loginSession.getHeaders(headers)
				
				return redirect('/me', { headers })
			} else {
				loginSession.flashError('Invalid email or password')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}
		} else if (intent === 'signup') {
			if (typeof password !== 'string' || password.length === 0) {
				loginSession.flashError('Password is required')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			if (password !== confirmPassword) {
				loginSession.flashError('Passwords do not match')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			const passwordValidation = validatePassword(password)
			if (!passwordValidation.isValid) {
				loginSession.flashError(passwordValidation.errors[0] || 'Password is not strong enough')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			if (typeof firstName !== 'string' || !firstName) {
				loginSession.flashError('First name is required')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}

			const result = await signupWithPassword({
				email: emailAddress,
				password,
				firstName,
				lastName: typeof lastName === 'string' ? lastName : '',
			})

			if (result?.user) {
				const session = await getSession(request)
				await session.signIn(result.user)
				
				const headers = new Headers()
				await session.getHeaders(headers)
				await loginSession.getHeaders(headers)
				
				return redirect('/me', { headers })
			} else {
				loginSession.flashError('Email address is already in use')
				return redirect(`/login`, {
					status: 400,
					headers: await loginSession.getHeaders(),
				})
			}
		} else if (intent === 'forgot-password') {
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
		}
	} catch (error: unknown) {
		loginSession.flashError(getErrorMessage(error))
		return redirect(`/login`, {
			status: 400,
			headers: await loginSession.getHeaders(),
		})
	}

	return redirect('/login')
}

const AuthenticationOptionsSchema = z.object({
	options: z.object({ challenge: z.string() }),
}) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

type Tab = 'signin' | 'signup' | 'forgot-password'

function Login() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const inputRef = React.useRef<HTMLInputElement>(null)
	const navigate = useNavigate()
	const { revalidate } = useRevalidator()
	const [error, setError] = React.useState<string>()
	const [passkeyMessage, setPasskeyMessage] = React.useState<null | string>(
		null,
	)

	const [activeTab, setActiveTab] = React.useState<Tab>('signin')
	const [formValues, setFormValues] = React.useState({
		email: data.email ?? '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
	})

	const emailIsValid = formValues.email.match(/.+@.+/)
	const passwordsMatch = formValues.password === formValues.confirmPassword
	
	const formIsValid = (() => {
		switch (activeTab) {
			case 'signin':
				return emailIsValid && formValues.password
			case 'signup':
				return emailIsValid && formValues.password && passwordsMatch && formValues.firstName
			case 'forgot-password':
				return emailIsValid
		}
	})()

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

	const tabConfig = {
		signin: {
			label: 'Sign In',
			description: 'Sign in to your existing account',
			buttonText: 'Sign In',
		},
		signup: {
			label: 'Sign Up',
			description: 'Create a new account',
			buttonText: 'Create Account',
		},
		'forgot-password': {
			label: 'Forgot Password',
			description: 'Reset your password',
			buttonText: 'Send Reset Email',
		},
	} as const

	return (
		<>
			<HeroSection
				imageBuilder={images.skis}
				imageSize="medium"
				title="Welcome back!"
				subtitle="Sign in, create an account, or reset your password."
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

								{/* Tabs */}
								<div className="mb-6">
									<div className="border-b border-gray-200">
										<nav className="-mb-px flex space-x-8" aria-label="Tabs">
											{Object.entries(tabConfig).map(([tab, config]) => (
												<button
													key={tab}
													type="button"
													onClick={() => setActiveTab(tab as Tab)}
													className={clsx(
														'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
														activeTab === tab
															? 'border-blue-500 text-blue-600'
															: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
													)}
													aria-current={activeTab === tab ? 'page' : undefined}
												>
													{config.label}
												</button>
											))}
										</nav>
									</div>
								</div>

								{/* Success message for forgot password */}
								{actionData?.success ? (
									<div className="mb-6 rounded-md bg-green-50 p-4">
										<div className="text-green-800">
											<h3 className="text-sm font-medium">Check your email</h3>
											<div className="mt-2 text-sm">
												<p>{actionData.message}</p>
											</div>
										</div>
									</div>
								) : (
									<Form
										onChange={(event) => {
											const form = event.currentTarget
											setFormValues({ 
												email: form.email.value,
												password: form.password?.value || '',
												confirmPassword: form.confirmPassword?.value || '',
												firstName: form.firstName?.value || '',
												lastName: form.lastName?.value || '',
											})
										}}
										action="/login"
										method="POST"
										className="mb-10 lg:mb-12"
									>
										<input type="hidden" name="intent" value={activeTab} />
										
										<div className="mb-6">
											<Label htmlFor="email-address">Email address</Label>
											<Input
												ref={inputRef}
												autoFocus
												aria-describedby={
													data.error ? 'error-message' : undefined
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

										{activeTab === 'signup' && (
											<>
												<div className="mb-6">
													<Label htmlFor="firstName">First Name</Label>
													<Input
														id="firstName"
														name="firstName"
														type="text"
														autoComplete="given-name"
														required
														placeholder="First name"
													/>
												</div>

												<div className="mb-6">
													<Label htmlFor="lastName">Last Name</Label>
													<Input
														id="lastName"
														name="lastName"
														type="text"
														autoComplete="family-name"
														placeholder="Last name (optional)"
													/>
												</div>
											</>
										)}

										{(activeTab === 'signin' || activeTab === 'signup') && (
											<div className="mb-6">
												<Label htmlFor="password">Password</Label>
												<Input
													id="password"
													name="password"
													type="password"
													autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
													required
													placeholder="Password"
												/>
											</div>
										)}

										{activeTab === 'signup' && (
											<div className="mb-6">
												<Label htmlFor="confirmPassword">Confirm Password</Label>
												<Input
													id="confirmPassword"
													name="confirmPassword"
													type="password"
													autoComplete="new-password"
													required
													placeholder="Confirm password"
												/>
												{formValues.password && formValues.confirmPassword && !passwordsMatch && (
													<InputError>Passwords do not match</InputError>
												)}
											</div>
										)}

										<div className="flex flex-wrap gap-4">
											<Button type="submit" disabled={!formIsValid}>
												{tabConfig[activeTab].buttonText}
											</Button>
											<LinkButton
												type="reset"
												onClick={() => {
													setFormValues({ 
														email: '', 
														password: '', 
														confirmPassword: '', 
														firstName: '', 
														lastName: '' 
													})
													inputRef.current?.focus()
												}}
											>
												Reset
											</LinkButton>
										</div>

										<div className="sr-only" aria-live="polite">
											{formIsValid
												? `${tabConfig[activeTab].description} form is now valid and ready to submit`
												: `${tabConfig[activeTab].description} form is now invalid.`}
										</div>

										<div className="mt-2">
											{data.error ? (
												<InputError id="error-message">{data.error}</InputError>
											) : null}
										</div>
									</Form>
								)}
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
					{activeTab === 'signin' && `
						To sign in to your account, enter your email and password above.
						If you don't have a password yet, click the "Forgot Password" tab to set one up.
					`}
					{activeTab === 'signup' && `
						Create a new account by filling out the form above. 
						You'll need to provide a strong password that includes uppercase, lowercase, numbers, and special characters.
					`}
					{activeTab === 'forgot-password' && `
						Enter your email address and we'll send you instructions to reset your password.
						This will work even if you've never set a password before.
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
