import { generateRegistrationOptions } from '@simplewebauthn/server'
import { data as json } from 'react-router'
import { db } from '#app/utils/db.server.ts'
import { passkeyTable } from '#app/utils/db/schema.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import {
	PasskeyCookieSchema,
	passkeyCookie,
	getWebAuthnConfig,
} from '#app/utils/webauthn.server.ts'
import { type Route } from './+types/generate-registration-options'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const passkeys = await db.findMany(passkeyTable, {
		where: { userId: user.id },
	})

	const config = getWebAuthnConfig(request)
	const options = await generateRegistrationOptions({
		rpName: config.rpName,
		rpID: config.rpID,
		userName: user.email,
		userID: new TextEncoder().encode(user.id),
		userDisplayName: user.firstName,
		attestationType: 'none',
		excludeCredentials: passkeys.map((passkey) => ({ id: passkey.id })),
		authenticatorSelection: config.authenticatorSelection,
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
