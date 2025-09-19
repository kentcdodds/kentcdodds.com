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
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getErrorMessage } from '#app/utils/misc.tsx'
import { getSession } from '#app/utils/session.server.ts'
import { isCodeValid, verifySessionStorage } from '#app/utils/verification.server.ts'

const codeQueryParam = 'code'
const typeQueryParam = 'type'
const targetQueryParam = 'target'
const redirectToQueryParam = 'redirectTo'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const code = url.searchParams.get(codeQueryParam)
	const type = url.searchParams.get(typeQueryParam)
	const target = url.searchParams.get(targetQueryParam)
	const redirectTo = url.searchParams.get(redirectToQueryParam)

	if (!type || !target) {
		throw new Response('Invalid verification link', { status: 400 })
	}

	// Auto-verify if code is provided in URL
	if (code) {
		const codeIsValid = await isCodeValid({ code, type, target })
		if (codeIsValid) {
			const verifySession = await verifySessionStorage.getSession()
			verifySession.set('verified', { type, target })
			
			if (type === 'reset-password') {
				return redirect('/reset-password', {
					headers: {
						'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
					},
				})
			} else if (type === 'onboarding') {
				return redirect('/signup', {
					headers: {
						'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
					},
				})
			}
			
			return redirect(redirectTo || '/me', {
				headers: {
					'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
				},
			})
		}
	}

	return json({ type, target, redirectTo })
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const code = formData.get('code')
	const type = formData.get('type')
	const target = formData.get('target')
	const redirectTo = formData.get('redirectTo')

	if (typeof code !== 'string' || !code) {
		return json({ error: 'Code is required' }, { status: 400 })
	}
	if (typeof type !== 'string' || !type) {
		return json({ error: 'Type is required' }, { status: 400 })
	}
	if (typeof target !== 'string' || !target) {
		return json({ error: 'Target is required' }, { status: 400 })
	}

	try {
		const codeIsValid = await isCodeValid({ code, type, target })
		if (!codeIsValid) {
			return json({ error: 'Invalid or expired code' }, { status: 400 })
		}

		const verifySession = await verifySessionStorage.getSession()
		verifySession.set('verified', { type, target })

		if (type === 'reset-password') {
			return redirect('/reset-password', {
				headers: {
					'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
				},
			})
		} else if (type === 'onboarding') {
			return redirect('/signup', {
				headers: {
					'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
				},
			})
		}

		return redirect(typeof redirectTo === 'string' ? redirectTo : '/me', {
			headers: {
				'Set-Cookie': await verifySessionStorage.commitSession(verifySession),
			},
		})
	} catch (error: unknown) {
		return json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export default function Verify() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const codeRef = React.useRef<HTMLInputElement>(null)

	const [code, setCode] = React.useState('')

	return (
		<div className="mt-24 pt-6">
			<HeaderSection
				as="header"
				title="Verify your email"
				subTitle="Enter the verification code sent to your email."
				className="mb-16"
			/>
			<main>
				<Grid>
					<div className="col-span-full lg:col-span-6">
						<Form method="POST">
							<input type="hidden" name="type" value={data.type} />
							<input type="hidden" name="target" value={data.target} />
							<input type="hidden" name="redirectTo" value={data.redirectTo || ''} />

							<div className="mb-6">
								<Label htmlFor="code">Verification Code</Label>
								<Input
									ref={codeRef}
									id="code"
									name="code"
									type="text"
									value={code}
									onChange={(e) => setCode(e.target.value)}
									placeholder="Enter 6-digit code"
									autoComplete="one-time-code"
									autoFocus
									required
								/>
								{actionData?.error ? (
									<InputError id="code-error">{actionData.error}</InputError>
								) : null}
							</div>

							<Button type="submit" disabled={code.length !== 6}>
								Verify
							</Button>
						</Form>

						<div className="mt-8">
							<H2 variant="secondary">
								Check your email for a 6-digit verification code.
							</H2>
							<p className="mt-4 text-gray-600">
								The code was sent to <strong>{data.target}</strong>
							</p>
						</div>
					</div>
				</Grid>
			</main>
		</div>
	)
}