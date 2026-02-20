import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { data as json, type ActionFunctionArgs } from 'react-router';
import { passkeyCookie, getWebAuthnConfig } from '#app/utils/webauthn.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	const config = getWebAuthnConfig(request)
	const options = await generateAuthenticationOptions({
		rpID: config.rpID,
		userVerification: config.authenticatorSelection.userVerification,
	})

	const cookieHeader = await passkeyCookie.serialize({
		challenge: options.challenge,
	})

	return json({ options }, { headers: { 'Set-Cookie': cookieHeader } })
}
