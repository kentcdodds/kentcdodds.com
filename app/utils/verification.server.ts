import { createSessionStorage } from '@remix-run/node'
import crypto from 'node:crypto'
import { getRequiredServerEnvVar, getDomainUrl } from './misc.tsx'
import { prisma } from './prisma.server.ts'

export const verifySessionStorage = createSessionStorage({
	cookie: {
		name: 'kcd_verification',
		sameSite: 'lax', // CSRF protection is advised if changing to 'none'
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
		secure: process.env.NODE_ENV === 'production',
	},
})

export type VerifyFunctionArgs = {
	request: Request
	submission: {
		intent: string
		payload: Record<string, unknown>
	}
	body: FormData | URLSearchParams
}

const codeQueryParam = 'code'
const typeQueryParam = 'type'
const targetQueryParam = 'target'
const redirectToQueryParam = 'redirectTo'

export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	request: Request
	type: string
	target: string
	redirectTo?: string
}) {
	const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`)
	redirectToUrl.searchParams.set(typeQueryParam, type)
	redirectToUrl.searchParams.set(targetQueryParam, target)
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo)
	}
	return redirectToUrl
}

export function getVerifyUrl({
	request,
	type,
	target,
	code,
	redirectTo,
}: {
	request: Request
	type: string
	target: string
	code?: string
	redirectTo?: string
}) {
	const verifyUrl = getRedirectToUrl({ request, type, target, redirectTo })
	if (code) verifyUrl.searchParams.set(codeQueryParam, code)
	return verifyUrl
}

// Simple 6-digit code generation
export function generateVerificationCode(): string {
	return Math.random().toString().slice(2, 8).padStart(6, '0')
}

export async function prepareVerification({
	period = 600, // 10 minutes default
	request,
	type,
	target,
}: {
	period?: number
	request: Request
	type: string
	target: string
}) {
	const verifyUrl = getRedirectToUrl({ request, type, target })
	const redirectTo = new URL(verifyUrl.toString())

	const code = generateVerificationCode()
	const secret = crypto.randomBytes(32).toString('hex')
	
	const verificationData = {
		type,
		target,
		secret: code, // Store the code directly in secret for simplicity
		algorithm: 'SHA256',
		digits: 6,
		period,
		charSet: '0123456789',
		expiresAt: new Date(Date.now() + period * 1000),
	}
	
	await prisma.verification.upsert({
		where: { target_type: { target, type } },
		create: verificationData,
		update: verificationData,
	})

	// add the code to the url we'll email the user.
	verifyUrl.searchParams.set(codeQueryParam, code)

	return { otp: code, redirectTo, verifyUrl }
}

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string
	type: string
	target: string
}) {
	const verification = await prisma.verification.findUnique({
		where: {
			target_type: { target, type },
			OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
		},
		select: {
			secret: true,
			expiresAt: true,
		},
	})
	
	if (!verification) return false
	if (verification.expiresAt && verification.expiresAt < new Date()) return false
	
	// Compare the submitted code with the stored code
	return verification.secret === code
}

export async function validateRequest(
	request: Request,
	body: URLSearchParams | FormData,
) {
	const code = body.get(codeQueryParam)
	const type = body.get(typeQueryParam)
	const target = body.get(targetQueryParam)

	if (typeof code !== 'string' || !code) {
		return { status: 'error', error: 'Code is required' } as const
	}
	if (typeof type !== 'string' || !type) {
		return { status: 'error', error: 'Type is required' } as const
	}
	if (typeof target !== 'string' || !target) {
		return { status: 'error', error: 'Target is required' } as const
	}

	const codeIsValid = await isCodeValid({ code, type, target })
	if (!codeIsValid) {
		return { status: 'error', error: 'Invalid code' } as const
	}

	return { status: 'success', submission: { code, type, target } } as const
}