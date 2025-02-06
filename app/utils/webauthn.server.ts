import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
} from '@simplewebauthn/server'

const rpName = 'kentcdodds.com'
const rpID = 'kentcdodds.com' // Must match your domain
const origin = `https://${rpID}` // Or http://localhost:3000 for development

export async function generateRegistrationCredentials(email: string) {
	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName: email,
		userDisplayName: email,
		attestationType: 'none',
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred',
		},
	})

	console.dir(
		{ generateRegistrationCredentialsOptions: options },
		{ depth: 6, colors: true },
	)

	return options
}

export async function verifyRegistration(
	credential: any,
	expectedChallenge: string,
) {
	try {
		const verification = await verifyRegistrationResponse({
			response: credential,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
		})

		return {
			verified: verification.verified,
			credentialID: verification.registrationInfo?.credentialID,
			publicKey: verification.registrationInfo?.credentialPublicKey,
		}
	} catch (error) {
		console.error(error)
		return { verified: false }
	}
}

export async function generateAuthenticationCredentials() {
	const challenge = await generateChallenge()

	const options = await generateAuthenticationOptions({
		rpID,
		challenge,
		userVerification: 'preferred',
	})

	return options
}

export async function verifyAuthentication(
	credential: any,
	expectedChallenge: string,
	publicKey: Buffer,
) {
	try {
		const verification = await verifyAuthenticationResponse({
			response: credential,
			expectedChallenge,
			expectedOrigin: origin,
			expectedRPID: rpID,
			authenticator: {
				credentialPublicKey: publicKey,
				credentialID: credential.id,
				counter: 0,
			},
		})

		return { verified: verification.verified }
	} catch (error) {
		console.error(error)
		return { verified: false }
	}
}
