import {
	type ActionFunctionArgs,
	json,
	redirect,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import * as React from 'react'
import { Button } from '#app/components/button.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { reuseUsefulLoaderHeaders, useDoubleCheck } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

const actionTypes = {
	DELETE_RECORDING: 'delete recording',
}

export async function action({ params, request }: ActionFunctionArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	const user = await requireUser(request)
	const call = await prisma.call.findFirst({
		// NOTE: this is how we ensure the user is the owner of the call
		// and is therefore authorized to delete it.
		where: { userId: user.id, id: params.callId },
	})
	if (!call) {
		// Maybe they tried to delete a call they don't own?
		console.warn(
			`Failed to get a call to delete by userId: ${user.id} and callId: ${params.callId}`,
		)
		return redirect('/calls/record')
	}
	await prisma.call.delete({ where: { id: params.callId } })

	return redirect('/calls/record')
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	const user = await requireUser(request)
	const call = await prisma.call.findFirst({
		// NOTE: this is how we ensure the user is the owner of the call
		// and is therefore authorized to delete it.
		where: { userId: user.id, id: params.callId },
	})
	if (!call) {
		return redirect('/calls/record')
	}
	return json(
		{ call },
		{
			headers: {
				'Cache-Control': 'public, max-age=10',
			},
		},
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function Screen() {
	const data = useLoaderData<typeof loader>()
	const [audioURL, setAudioURL] = React.useState<string | null>(null)
	const dc = useDoubleCheck()
	React.useEffect(() => {
		const audio = new Audio(data.call.base64)
		setAudioURL(audio.src)
	}, [data.call.base64])

	return (
		<section>
			<Paragraph className="mb-8">{data.call.description}</Paragraph>
			<div className="flex flex-wrap gap-4">
				<div className="w-full flex-1" style={{ minWidth: '16rem' }}>
					{audioURL ? (
						<audio
							src={audioURL}
							controls
							preload="metadata"
							className="w-full"
						/>
					) : null}
				</div>
				<Form method="delete">
					<input
						type="hidden"
						name="actionType"
						value={actionTypes.DELETE_RECORDING}
					/>
					<input type="hidden" name="callId" value={data.call.id} />
					<Button
						type="submit"
						variant="danger"
						size="medium"
						autoFocus
						{...dc.getButtonProps()}
					>
						{dc.doubleCheck ? 'You sure?' : 'Delete'}
					</Button>
				</Form>
			</div>
		</section>
	)
}
