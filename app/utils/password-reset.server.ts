import { getDomainUrl } from './misc.ts'
import { prisma } from './prisma.server.ts'
import { sendPasswordResetEmail } from './send-email.server.ts'
import { createVerification } from './verification.server.ts'

/**
 * Creates a PASSWORD_RESET verification and sends the email.
 *
 * - Swallows non-fatal provider/runtime errors so auth flows can still show a
 *   generic "check your email" message.
 */
export async function createAndSendPasswordResetVerificationEmail({
	emailAddress,
	team,
	request,
}: {
	emailAddress: string
	team: string
	request: Request
}) {
	const domainUrl = getDomainUrl(request)

	let verificationId: string | null = null
	try {
		const { verification, code } = await createVerification({
			type: 'PASSWORD_RESET',
			target: emailAddress,
		})
		verificationId = verification.id

		const verificationUrl = new URL('/reset-password', domainUrl)
		verificationUrl.searchParams.set('verification', verification.id)
		verificationUrl.searchParams.set('code', code)

		await sendPasswordResetEmail({
			emailAddress,
			verificationCode: code,
			verificationUrl: verificationUrl.toString(),
			domainUrl,
			team,
		})
	} catch (error: unknown) {
		if (verificationId) {
			try {
				// Best effort: don't leave unused verifications around if email sending fails.
				await prisma.verification.delete({ where: { id: verificationId } })
			} catch (cleanupError) {
				console.error(
					'Failed to cleanup verification after password reset email failure',
					cleanupError,
				)
			}
		}
		console.error('Failed to send password reset email', error)
	}
}
