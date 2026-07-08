import {
	type AuthenticationResponseJSON,
	verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { data as json } from 'react-router'
import { z } from 'zod'
import { db } from '#app/utils/db.server.ts'
import { passkeyTable, userTable } from '#app/utils/db/schema.server.ts'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { getSession } from '#app/utils/session.server.ts'
import { getWebAuthnConfig, passkeyCookie } from '#app/utils/webauthn.server.ts'
import { type Route } from './+types/verify-authentication'

const AuthenticationResponseSchema = z.object({
	id: z.string(),
	rawId: z.string(),
	response: z.object({
		clientDataJSON: z.string(),
		authenticatorData: z.string(),
		signature: z.string(),
		userHandle: z.string().optional(),
	}),
	type: z.literal('public-key'),
	clientExtensionResults: z.object({
		appid: z.boolean().optional(),
		credProps: z
			.object({
				rk: z.boolean().optional(),
			})
			.optional(),
		hmacCreateSecret: z.boolean().optional(),
	}),
}) satisfies z.ZodType<AuthenticationResponseJSON>

export async function action({ request }: Route.ActionArgs) {
	const cookieHeader = request.headers.get('Cookie')
	const cookie = await passkeyCookie.parse(cookieHeader)
	const deletePasskeyCookie = await passkeyCookie.serialize('', { maxAge: 0 })
	try {
		if (!cookie?.challenge) {
			throw new Error('Authentication challenge not found')
		}

		const body = await request.json()
		const result = AuthenticationResponseSchema.safeParse(body)
		if (!result.success) {
			throw new Error('Invalid authentication response')
		}

		const passkey = await db.find(passkeyTable, result.data.id)
		const user = passkey ? await db.find(userTable, passkey.userId) : null
		if (!passkey || !user) {
			throw new Error('Passkey not found')
		}

		const config = getWebAuthnConfig(request)

		const verification = await verifyAuthenticationResponse({
			response: result.data,
			expectedChallenge: cookie.challenge,
			expectedOrigin: config.origin,
			expectedRPID: config.rpID,
			credential: {
				id: result.data.id,
				publicKey: new Uint8Array(passkey.publicKey as Uint8Array),
				counter: passkey.counter as number,
			},
		})

		if (!verification.verified) {
			throw new Error('Authentication verification failed')
		}

		// Update the authenticator's counter in the DB to the newest count
		await db.update(passkeyTable, passkey.id, {
			counter: verification.authenticationInfo.newCounter,
		})

		const session = await getSession(request)
		await session.signIn(user)

		const headers = new Headers({ 'Set-Cookie': deletePasskeyCookie })

		// Passkey sign-in should also clear any stored email/error from the traditional
		// password login flow.
		const loginSession = await getLoginInfoSession(request)
		loginSession.clean()
		await loginSession.getHeaders(headers)
		await session.getHeaders(headers)

		return json({ status: 'success' } as const, { headers })
	} catch (error) {
		console.error('Error during authentication verification:', error)
		return json(
			{
				status: 'error',
				error: error instanceof Error ? error.message : 'Verification failed',
			} as const,
			{ status: 400, headers: { 'Set-Cookie': deletePasskeyCookie } },
		)
	}
}
