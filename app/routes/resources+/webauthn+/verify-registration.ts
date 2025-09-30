import { json, type ActionFunctionArgs } from '@remix-run/node'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { getDomainUrl, getErrorMessage } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import {
	PasskeyCookieSchema,
	RegistrationResponseSchema,
	passkeyCookie,
} from '#app/utils/webauthn.server.js'

export async function action({ request }: ActionFunctionArgs) {
	const user = await requireUser(request)

	if (request.method !== 'POST') {
		return json({ status: 'error', error: 'Method not allowed' } as const, 405)
	}

	const body = await request.json()
	const result = RegistrationResponseSchema.safeParse(body)
	if (!result.success) {
		return json(
			{ status: 'error', error: 'Invalid registration response' } as const,
			400,
		)
	}

	const data = result.data

	// Get challenge from cookie
	const passkeyCookieData = await passkeyCookie.parse(
		request.headers.get('Cookie'),
	)
	const parsedPasskeyCookieData =
		PasskeyCookieSchema.safeParse(passkeyCookieData)
	if (!parsedPasskeyCookieData.success) {
		return json({ status: 'error', error: 'No challenge found' } as const, 400)
	}
	const { challenge, userId: webauthnUserId } = parsedPasskeyCookieData.data

	const domain = new URL(getDomainUrl(request)).hostname
	const rpID = domain
	const origin = getDomainUrl(request)

	let verification
	try {
		verification = await verifyRegistrationResponse({
			response: data,
			expectedChallenge: challenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			requireUserVerification: true,
		})
	} catch (error) {
		console.error(error)
		return json(
			{ status: 'error', error: getErrorMessage(error) } as const,
			400,
		)
	}

	const { verified, registrationInfo } = verification
	if (!verified || !registrationInfo) {
		return json(
			{ status: 'error', error: 'Registration verification failed' } as const,
			400,
		)
	}
	const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
		registrationInfo

	const existingPasskey = await prisma.passkey.findUnique({
		where: { id: credential.id },
		select: { id: true },
	})

	if (existingPasskey) {
		return json(
			{
				status: 'error',
				error: 'This passkey has already been registered',
			} as const,
			400,
		)
	}

	// Create new passkey in database
	await prisma.passkey.create({
		data: {
			id: credential.id,
			aaguid,
			publicKey: new Uint8Array(credential.publicKey),
			userId: user.id,
			webauthnUserId,
			counter: credential.counter,
			deviceType: credentialDeviceType,
			backedUp: credentialBackedUp,
			transports: credential.transports?.join(','),
		},
	})

	// Clear the challenge cookie
	return json({ status: 'success' } as const, {
		headers: {
			'Set-Cookie': await passkeyCookie.serialize('', { maxAge: 0 }),
		},
	})
}
