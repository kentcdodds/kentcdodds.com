import { clsx } from 'clsx'
import { data as json, redirect, Link, Outlet, useLoaderData, useParams } from 'react-router';
import { Grid } from '#app/components/grid.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H2, H6, Paragraph } from '#app/components/typography.tsx'
import { type KCDHandle } from '#app/types.ts'
import { formatDate, getAvatarForUser } from '#app/utils/misc.tsx'
import { prisma } from '#app/utils/prisma.server.ts'
import { requireAdminUser } from '#app/utils/session.server.ts'
import { useRootData } from '#app/utils/use-root-data.ts'
import  { type Route } from './+types/_layout'

export const handle: KCDHandle = {
	getSitemapEntries: () => null,
}

export async function action({ request }: Route.ActionArgs) {
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

export async function loader({ request }: Route.LoaderArgs) {
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
	const data = useLoaderData<Route.ComponentProps['loaderData']>()
	const { requestInfo } = useRootData()
	const params = useParams()
	const selectedCallId = params.callId

	return (
		<main className="mt-12 mb-24 lg:mt-24 lg:mb-48">
			<Grid>
				<div className="col-span-full mb-8 lg:mb-12">
					<H2>Calls Admin</H2>
					<H2 variant="secondary" as="p">
						{data.calls.length} pending{' '}
						{data.calls.length === 1 ? 'call' : 'calls'}
					</H2>
				</div>

				{/* Sidebar - Call List */}
				<div className="col-span-full lg:col-span-4">
					<H6 as="h3" className="mb-4">
						Pending Calls
					</H6>
					{data.calls.length ? (
						<nav aria-label="Call list">
							<ul className="flex flex-col gap-4">
								{data.calls.map((call) => {
									const avatar = getAvatarForUser(call.user, {
										origin: requestInfo.origin,
									})
									const isSelected = selectedCallId === call.id
									return (
										<li
											key={call.id}
											className={`set-color-team-current-${call.user.team.toLowerCase()}`}
										>
											<Link
												to={call.id}
												className={clsx(
													'group relative block rounded-lg p-4 transition focus:outline-none',
													isSelected
														? 'ring-team-current bg-gray-100 ring-2 dark:bg-gray-800'
														: 'hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800',
												)}
											>
												<div className="flex items-start gap-4">
													<img
														alt={avatar.alt}
														src={avatar.src}
														className="ring-team-current h-12 w-12 flex-none rounded-full object-cover ring-2"
													/>
													<div className="min-w-0 flex-1">
														<p className="text-primary truncate font-medium">
															{call.title}
														</p>
														<p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-500">
															{call.user.firstName} • {call.user.email}
														</p>
														<p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
															{call.description}
														</p>
														<p className="mt-2 text-xs text-gray-400 dark:text-slate-600">
															{formatDate(call.updatedAt)}
														</p>
													</div>
												</div>
											</Link>
										</li>
									)
								})}
							</ul>
						</nav>
					) : (
						<div className="rounded-lg bg-gray-100 p-8 text-center dark:bg-gray-800">
							<Paragraph className="text-gray-500 dark:text-slate-500">
								No pending calls 🎉
							</Paragraph>
						</div>
					)}
				</div>

				{/* Spacer for mobile */}
				<Spacer size="xs" className="col-span-full block lg:hidden" />

				{/* Main Content Area */}
				<div className="col-span-full lg:col-span-7 lg:col-start-6">
					<Outlet />
				</div>
			</Grid>
		</main>
	)
}
