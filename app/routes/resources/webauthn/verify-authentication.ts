import {
	type AuthenticationResponseJSON,
	verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { data as json } from 'react-router'
import { z } from 'zod'
import { getLoginInfoSession } from '#app/utils/login.server.ts'
import { prisma } from '#app/utils/prisma.server.ts'
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

		const passkey = await prisma.passkey.findUnique({
			where: { id: result.data.id },
			include: { user: true },
		})
		if (!passkey) {
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
				publicKey: passkey.publicKey,
				counter: Number(passkey.counter),
			},
		})

		if (!verification.verified) {
			throw new Error('Authentication verification failed')
		}

		// Update the authenticator's counter in the DB to the newest count
		await prisma.passkey.update({
			where: { id: passkey.id },
			data: { counter: BigInt(verification.authenticationInfo.newCounter) },
		})

		const session = await getSession(request)
		await session.signIn(passkey.user)

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
