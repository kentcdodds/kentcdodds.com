import { json } from '@remix-run/node'
import { addSubscriberToForm } from '#app/kit/kit.server.js'
import { getErrorMessage } from '#app/utils/misc.js'
import { isEmailVerified } from '#app/utils/verifier.server.js'

export async function action({ request }: { request: Request }) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	const formData = await request.formData()
	const email = formData.get('email')?.toString()
	const firstName = formData.get('firstName')?.toString()

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 })
	}

	const isVerified = await isEmailVerified(email)
	if (!isVerified.verified) {
		return json({ error: isVerified.message }, { status: 400 })
	}

	try {
		await addSubscriberToForm({
			email,
			firstName: firstName ?? '',
			kitFormId: '827139',
		})

		return json({
			message: `Successfully subscribed ${email} to Kent's newsletter! If you're not already on Kent's mailing list, you'll receive a confirmation email.`,
		})
	} catch (error) {
		return json(
			{
				error: `Failed to subscribe to the newsletter: ${getErrorMessage(error)}`,
			},
			{ status: 500 },
		)
	}
}
