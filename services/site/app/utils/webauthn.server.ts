import { type RegistrationResponseJSON } from '@simplewebauthn/server'
import { createCookie } from 'react-router'
import { z } from 'zod'
import { getEnv } from './env.server.ts'
import { getDomainUrl } from './misc.ts'

export const passkeyCookie = createCookie('webauthn-challenge', {
	path: '/',
	sameSite: 'lax',
	httpOnly: true,
	maxAge: 60 * 60 * 2,
	secure: getEnv().NODE_ENV === 'production',
	secrets: [getEnv().SESSION_SECRET],
})

export const PasskeyCookieSchema = z.object({
	challenge: z.string(),
	userId: z.string(),
})

export const RegistrationResponseSchema = z.object({
	id: z.string(),
	rawId: z.string(),
	response: z.object({
		clientDataJSON: z.string(),
		attestationObject: z.string(),
		transports: z
			.array(
				z.enum([
					'ble',
					'cable',
					'hybrid',
					'internal',
					'nfc',
					'smart-card',
					'usb',
				]),
			)
			.optional(),
	}),
	authenticatorAttachment: z.enum(['cross-platform', 'platform']).optional(),
	clientExtensionResults: z.object({
		credProps: z
			.object({
				rk: z.boolean(),
			})
			.optional(),
	}),
	type: z.literal('public-key'),
}) satisfies z.ZodType<RegistrationResponseJSON>

export function getWebAuthnConfig(request: Request) {
	const url = new URL(getDomainUrl(request))
	return {
		rpName: `KCD (${url.hostname})`,
		rpID: url.hostname,
		origin: url.origin,
		// Common options for both registration and authentication
		authenticatorSelection: {
			// Required for discoverable credentials, which enables privacy-friendly
			// passkey sign-in via form autofill / conditional UI.
			residentKey: 'required',
			userVerification: 'preferred',
		},
	} as const
}
