import * as React from 'react'
import { data as json, redirect, type HeadersFunction, Form } from 'react-router';
import { Button } from '#app/components/button.tsx'
import { Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { reuseUsefulLoaderHeaders, useDoubleCheck } from '#app/utils/misc-react.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import  { type Route } from './+types/$callId'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

const actionTypes = {
	DELETE_RECORDING: 'delete recording',
}

export async function action({ params, request }: Route.ActionArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	const user = await requireUser(request)
	const call = await prisma.call.findFirst({
		// NOTE: this is how we ensure the user is the owner of the call
		// and is therefore authorized to delete it.
		where: { userId: user.id, id: params.callId },
		select: {
			id: true,
			audioKey: true,
			episodeDraft: { select: { episodeAudioKey: true } },
		},
	})
	if (!call) {
		// Maybe they tried to delete a call they don't own?
		console.warn(
			`Failed to get a call to delete by userId: ${user.id} and callId: ${params.callId}`,
		)
		return redirect('/calls/record')
	}
	await prisma.call.delete({ where: { id: params.callId } })
	const keysToDelete = [call.audioKey, call.episodeDraft?.episodeAudioKey].filter(
		(k): k is string => typeof k === 'string' && k.length > 0,
	)
	if (keysToDelete.length) {
		const { deleteAudioObject } = await import(
			'#app/utils/call-kent-audio-storage.server.ts'
		)
		await Promise.all(
			keysToDelete.map(async (key) => deleteAudioObject({ key }).catch(() => {})),
		)
	}

	return redirect('/calls/record')
}

export async function loader({ params, request }: Route.LoaderArgs) {
	if (!params.callId) {
		throw new Error('params.callId is not defined')
	}
	const user = await requireUser(request)
	const call = await prisma.call.findFirst({
		// NOTE: this is how we ensure the user is the owner of the call
		// and is therefore authorized to delete it.
		where: { userId: user.id, id: params.callId },
		select: {
			id: true,
			notes: true,
		},
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

export default function Screen({ loaderData: data }: Route.ComponentProps) {
	const dc = useDoubleCheck()

	return (
		<section>
			{data.call.notes ? (
				<Paragraph className="mb-8 whitespace-pre-wrap">{data.call.notes}</Paragraph>
			) : (
				<Paragraph className="mb-8">{`Thanks for your call!`}</Paragraph>
			)}
			<div className="flex flex-wrap gap-4">
				<div className="w-full flex-1" style={{ minWidth: '16rem' }}>
					<audio
						src={`/resources/calls/call-audio?callId=${data.call.id}`}
						controls
						preload="metadata"
						className="w-full"
					/>
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
