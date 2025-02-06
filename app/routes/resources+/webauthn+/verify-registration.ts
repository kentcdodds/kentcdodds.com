import { json, type ActionFunctionArgs } from '@remix-run/node'
import {
	verifyRegistrationResponse,
	type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { decodeAttestationObject } from '@simplewebauthn/server/helpers'
import { z } from 'zod'
import { getDomainUrl, getErrorMessage } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import {
	PasskeyCookieSchema,
	passkeyCookie,
} from './generate-registration-options.ts'

const RegistrationResponseSchema = z.object({
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

function parseAuthData(authData: Uint8Array) {
	let pointer = 0

	// rpIdHash: SHA-256 hash of the RP ID
	const rpIdHash = authData.slice(pointer, pointer + 32)
	pointer += 32

	// flags: Bit flags indicating various attributes
	const flags = authData[pointer]
	pointer += 1

	// signCount: Signature counter, 32-bit unsigned big-endian integer
	const signCount = new DataView(authData.buffer).getUint32(pointer, false)
	pointer += 4

	// aaguid: Authenticator Attestation GUID, identifies the type of the authenticator
	const aaguid = authData.slice(pointer, pointer + 16)
	pointer += 16

	// credentialIdLength: Length of the credential ID, 16-bit unsigned big-endian integer
	const credentialIdLength = new DataView(authData.buffer).getUint16(
		pointer,
		false,
	)
	pointer += 2

	// credentialId: Credential identifier
	const credentialId = authData.slice(pointer, pointer + credentialIdLength)
	pointer += credentialIdLength

	// credentialPublicKey: The credential public key in COSE_Key format
	const credentialPublicKey = authData.slice(pointer)

	return {
		rpIdHash: Buffer.from(rpIdHash).toString('hex'),
		flags,
		signCount,
		aaguid: Buffer.from(aaguid)
			.toString('hex')
			.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
		credentialId: Buffer.from(credentialId).toString('hex'),
		credentialPublicKey: Buffer.from(credentialPublicKey),
	}
}

function parseAttestationObject(attestationObject: string) {
	const attestationBuffer = new Uint8Array(
		Buffer.from(attestationObject, 'base64'),
	)
	const decodedAttestation = decodeAttestationObject(attestationBuffer)

	return {
		fmt: decodedAttestation.get('fmt'),
		attStmt: decodedAttestation.get('attStmt'),
		authData: parseAuthData(decodedAttestation.get('authData')),
	}
}

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
	let aaguid: string

	try {
		const parsedAttestation = parseAttestationObject(
			data.response.attestationObject,
		)
		aaguid = parsedAttestation.authData.aaguid
	} catch (error) {
		console.error(error)
		return json(
			{
				status: 'error',
				error: 'Failed to decode attestation object',
			} as const,
			400,
		)
	}

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
	const { credential, credentialDeviceType, credentialBackedUp } =
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
			publicKey: Buffer.from(credential.publicKey),
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
