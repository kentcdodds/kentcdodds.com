import { startRegistration } from '@simplewebauthn/browser'
import { type PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/server'
import { data as json, Form, useRevalidator } from 'react-router'
import { z } from 'zod'
import { Button } from '#app/components/button.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { type Route } from './+types/me_.passkeys'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const passkeys = await prisma.passkey.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			createdAt: true,
			deviceType: true,
			transports: true,
		},
	})

	return json({ passkeys })
}

export async function action({ request }: Route.ActionArgs) {
	const user = await requireUser(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const passkeyId = formData.get('passkeyId')

	if (intent === 'delete' && typeof passkeyId === 'string') {
		// First verify the passkey exists and belongs to the user
		const passkey = await prisma.passkey.findUnique({
			where: { id: passkeyId },
			select: { userId: true },
		})

		if (!passkey || passkey.userId !== user.id) {
			throw new Response('Passkey not found', { status: 404 })
		}

		// Delete using only the unique identifier
		await prisma.passkey.delete({
			where: { id: passkeyId },
		})
	}

	return json({ success: true })
}
const RegistrationResultSchema = z.object({
	options: z.object({
		rp: z.object({
			id: z.string(),
			name: z.string(),
		}),
		user: z.object({
			id: z.string(),
			name: z.string(),
			displayName: z.string(),
		}),
		challenge: z.string(),
		pubKeyCredParams: z.array(
			z.object({
				type: z.literal('public-key'),
				alg: z.number(),
			}),
		),
	}),
}) satisfies z.ZodType<{ options: PublicKeyCredentialCreationOptionsJSON }>

export default function PasskeysRoute({
	loaderData: { passkeys },
}: Route.ComponentProps) {
	const revalidator = useRevalidator()

	async function handleAddPasskey() {
		const resp = await fetch(
			'/resources/webauthn/generate-registration-options',
		)
		const jsonResult = await resp.json()
		const parsedResult = RegistrationResultSchema.parse(jsonResult)

		try {
			const regResult = await startRegistration({
				optionsJSON: parsedResult.options,
			})

			const verificationResp = await fetch(
				'/resources/webauthn/verify-registration',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(regResult),
				},
			)

			if (!verificationResp.ok) {
				throw new Error('Failed to verify registration')
			}

			void revalidator.revalidate()
		} catch (err) {
			console.error('Failed to create passkey:', err)
			alert('Failed to create passkey. Please try again.')
		}
	}

	return (
		<div className="mx-auto max-w-2xl py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Passkeys</h1>
				<form action={handleAddPasskey}>
					<Button>Add Passkey</Button>
				</form>
			</div>

			{passkeys.length === 0 ? (
				<div className="py-8 text-center text-gray-500">
					<p>You haven't set up any passkeys yet.</p>
					<p className="mt-2">
						Passkeys provide a secure, passwordless way to sign in to your
						account.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{passkeys.map((passkey) => (
						<div
							key={passkey.id}
							className="flex items-center justify-between rounded-lg border p-4"
						>
							<div>
								<div className="font-medium">
									{passkey.deviceType === 'singleDevice'
										? 'Single-device'
										: 'Multi-device'}{' '}
									Passkey
								</div>
								<div className="text-sm text-gray-500">
									Added {new Date(passkey.createdAt).toLocaleDateString()}
								</div>
								{passkey.transports && (
									<div className="text-sm text-gray-500">
										Transports: {passkey.transports.split(',').join(', ')}
									</div>
								)}
							</div>
							<Form method="post">
								<input type="hidden" name="passkeyId" value={passkey.id} />
								<Button
									type="submit"
									name="intent"
									value="delete"
									variant="danger"
									size="small"
								>
									Remove
								</Button>
							</Form>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
