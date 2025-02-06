import { json, type LoaderFunctionArgs, createCookie } from '@remix-run/node'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { z } from 'zod'
import { getDomainUrl } from '#app/utils/misc.js'
import { prisma } from '#app/utils/prisma.server.js'
import { requireUser } from '#app/utils/session.server.js'

export const passkeyCookie = createCookie('webauthn-challenge', {
	path: '/',
	sameSite: 'lax',
	httpOnly: true,
	maxAge: 60 * 60 * 2,
	secure: process.env.NODE_ENV === 'production',
	secrets: [process.env.SESSION_SECRET],
})

export const PasskeyCookieSchema = z.object({
	challenge: z.string(),
	userId: z.string(),
})

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)
	const passkeys = await prisma.passkey.findMany({
		where: { userId: user.id },
		select: { id: true },
	})

	const domain = new URL(getDomainUrl(request)).hostname

	const options = await generateRegistrationOptions({
		rpName: `KCD (${domain})`,
		rpID: domain,
		userName: user.email,
		userID: new TextEncoder().encode(user.id),
		userDisplayName: user.firstName,
		attestationType: 'none',
		excludeCredentials: passkeys,
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred',
		},
	})

	return json(
		{ options },
		{
			headers: {
				'Set-Cookie': await passkeyCookie.serialize(
					PasskeyCookieSchema.parse({
						challenge: options.challenge,
						userId: options.user.id,
					}),
				),
			},
		},
	)
}
