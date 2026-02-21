// verifier is an email verification service

import { getKitSubscriber } from '#app/kit/kit.server.js'
import { getErrorMessage, getRequiredServerEnvVar } from './misc.ts'
import { prisma } from './prisma.server.ts'

const VERIFIER_API_KEY = getRequiredServerEnvVar('VERIFIER_API_KEY')

type VerifierResult =
	| { status: true; email: string; domain: string }
	| {
			status: false
			error: { code: number; message: string }
	  }

export async function verifyEmailAddress(emailAddress: string) {
	const verifierUrl = new URL(`https://verifyright.co/verify/${emailAddress}`)
	verifierUrl.searchParams.append('token', VERIFIER_API_KEY)
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 2000)
	try {
		const response = await fetch(verifierUrl.toString(), {
			signal: controller.signal,
		})
		clearTimeout(timeoutId)
		const verifierResult: VerifierResult = await response.json()
		return verifierResult
	} catch (error: unknown) {
		clearTimeout(timeoutId)
		if (error instanceof Error && error.name === 'AbortError') {
			console.error('Email verification timed out:', emailAddress)
		} else {
			console.error('Error verifying email:', getErrorMessage(error))
		}
		// If the request times out, we'll return a default result
		// we don't I wanna block the user from logging in if we can't verify the email address
		// is invalid...
		return {
			status: true,
			email: emailAddress,
			domain: emailAddress.split('@')[1],
		} as const
	}
}

export async function isEmailVerified(
	email: string,
): Promise<{ verified: true } | { verified: false; message: string }> {
	const userExists = Boolean(
		await prisma.user.findUnique({
			select: { id: true },
			where: { email },
		}),
	)
	if (userExists) return { verified: true }
	const kitSubscriber = await getKitSubscriber(email)
	if (kitSubscriber) return { verified: true }

	const verifierResult = await verifyEmailAddress(email)
	if (verifierResult.status) return { verified: true }

	return { verified: false, message: verifierResult.error.message }
}
