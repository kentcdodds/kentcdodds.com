import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { getDomainUrl } from '#app/utils/misc.js'
import { prisma } from '#app/utils/prisma.server.js'
import { requireUser } from '#app/utils/session.server.js'
import {
	PasskeyCookieSchema,
	passkeyCookie,
} from '#app/utils/webauthn.server.js'

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
