import { data as json, redirect, Form } from 'react-router'
import { Button } from '#app/components/button.tsx'
import { getEnv } from '#app/utils/env.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/oauth.authorize'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const url = new URL(request.url)
	const clientId = url.searchParams.get('client_id')
	const redirectUri = url.searchParams.get('redirect_uri')
	if (!clientId || !redirectUri) {
		throw new Response('Missing client_id or redirect_uri', { status: 400 })
	}
	return json({ clientId, user })
}

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const url = new URL(request.url)
	const requestParams = Object.fromEntries(url.searchParams)
	const formData = await request.formData()
	const decision = formData.get('decision')

	if (!requestParams.client_id || !requestParams.redirect_uri) {
		return json(
			{
				status: 'error',
				message: 'Missing client_id or redirect_uri',
			} as const,
			{ status: 400 },
		)
	}

	if (decision === 'approve') {
		const params = Object.fromEntries(url.searchParams)
		// Call the Cloudflare Worker to complete authorization
		const response = await fetch(
			'https://kcd-oauth-provider.kentcdodds.workers.dev/internal/complete-authorization',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${getEnv().CF_INTERNAL_SECRET}`,
				},
				body: JSON.stringify({
					requestParams: {
						state: '',
						...params,
						scope: params.scope?.split(' ') ?? [],
					},
					userId: user.id,
					props: { userId: user.id },
					metadata: {},
				}),
			},
		)
		if (!response.ok) {
			console.error('Authorization failed', await response.text())
			return json(
				{
					status: 'error',
					message: 'Failed to complete authorization',
				} as const,
				{ status: 500 },
			)
		}
		let redirectTo: string | undefined = undefined
		try {
			const data = (await response.json()) as any
			if (typeof data.redirectTo === 'string') {
				redirectTo = data.redirectTo
			}
		} catch (e) {
			console.error('Invalid response from authorization server', e)
		}
		if (!redirectTo) {
			return json(
				{
					status: 'error',
					message: 'Invalid response from authorization server',
				} as const,
				{ status: 500 },
			)
		}
		// Add state param if present
		const redirectUrl = new URL(redirectTo)
		if (requestParams.state) {
			redirectUrl.searchParams.set('state', requestParams.state)
		}
		return redirect(redirectUrl.toString())
	} else {
		// Denied
		const params = new URLSearchParams({ error: 'access_denied' })
		if (requestParams.state) {
			params.set('state', requestParams.state)
		}
		throw redirect(`${requestParams.redirect_uri}?${params.toString()}`)
	}
}

export default function OAuthAuthorizeRoute({
	loaderData: { clientId, user },
	actionData,
}: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-md py-8">
			<h1 className="mb-4 text-2xl font-bold">Authorize Application</h1>
			<p className="mb-4">
				<strong>Application:</strong> {clientId}
			</p>
			<p className="mb-4">
				<strong>User:</strong> {user.email || user.firstName || user.id}
			</p>
			<p className="mb-6">
				This application is requesting <strong>full access</strong> to your
				account.
			</p>
			<Form method="post">
				<div className="flex gap-4">
					<Button
						type="submit"
						name="decision"
						value="approve"
						variant="primary"
					>
						Approve
					</Button>
					<Button type="submit" name="decision" value="deny" variant="danger">
						Deny
					</Button>
				</div>
			</Form>

			{actionData?.status === 'error' ? (
				<div className="mt-4 rounded border px-4 py-2 text-sm text-red-500">
					{actionData.message}
				</div>
			) : null}
		</div>
	)
}
