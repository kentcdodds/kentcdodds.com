import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { type KCDHandle } from '#app/types.ts'
import { getAvatarForUser } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAdminUser(request)

	const requestText = await request.text()
	const form = new URLSearchParams(requestText)
	const callId = form.get('callId')
	if (!callId) {
		// this should be impossible
		console.warn(`No callId provided to call delete action.`)
		return redirect(new URL(request.url).pathname)
	}
	const call = await prisma.call.findFirst({
		// NOTE: since we require an admin user, we don't need to check
		// whether this user is the creator of the call
		where: { id: callId },
	})
	if (!call) {
		// Maybe they tried to delete a call they don't own?
		console.warn(`Failed to get a call to delete by callId: ${callId}`)
		return redirect(new URL(request.url).pathname)
	}
	await prisma.call.delete({ where: { id: callId } })
	return redirect(new URL(request.url).pathname)
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAdminUser(request)

	const calls = await prisma.call.findMany({
		select: {
			id: true,
			title: true,
			description: true,
			updatedAt: true,
			user: { select: { firstName: true, team: true, email: true } },
		},
		orderBy: { updatedAt: 'desc' },
	})

	return json({ calls })
}

export default function CallListScreen() {
	const data = useLoaderData<typeof loader>()
	const { requestInfo } = useRootData()
	return (
		<div className="px-6">
			<main className="flex gap-8">
				<div className="w-52 overscroll-auto">
					{data.calls.length ? (
						<ul>
							{data.calls.map((call) => {
								const avatar = getAvatarForUser(call.user, {
									origin: requestInfo.origin,
								})
								return (
									<li
										key={call.id}
										className={`mb-6 set-color-team-current-${call.user.team.toLowerCase()}`}
									>
										<Link to={call.id} className="mb-1 block">
											<img
												alt={avatar.alt}
												src={avatar.src}
												className="block h-16 rounded-full"
											/>
											{call.title}
										</Link>
										<small>
											{call.description.slice(0, 30)}
											{call.description.length > 30 ? '...' : null}
										</small>
									</li>
								)
							})}
						</ul>
					) : (
						<p>No calls.</p>
					)}
				</div>
				<div className="flex-1">
					<Outlet />
				</div>
			</main>
		</div>
	)
}
