import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	getBlogReadRankings,
	notifyOfOverallTeamLeaderChange,
	notifyOfTeamLeaderChangeOnPost,
} from '~/utils/blog.server.ts'
import { getRankingLeader } from '~/utils/blog.ts'
import { getClientSession } from '~/utils/client.server.ts'
import { invariantResponse } from '~/utils/misc.tsx'
import { addPostRead } from '~/utils/prisma.server.ts'
import { getSession } from '~/utils/session.server.ts'

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const slug = formData.get('slug')
	invariantResponse(typeof slug === 'string', 'Missing slug')
	const session = await getSession(request)
	const user = await session.getUser()

	const [beforePostLeader, beforeOverallLeader] = await Promise.all([
		getBlogReadRankings({ request, slug }).then(getRankingLeader),
		getBlogReadRankings({ request }).then(getRankingLeader),
	])
	if (user) {
		await addPostRead({
			slug,
			userId: user.id,
		})
	} else {
		const client = await getClientSession(request, user)
		const clientId = client.getClientId()
		if (clientId) {
			await addPostRead({ slug, clientId })
		}
	}

	// trigger an update to the ranking cache and notify when the leader changed
	const [afterPostLeader, afterOverallLeader] = await Promise.all([
		getBlogReadRankings({
			request,
			slug,
			forceFresh: true,
		}).then(getRankingLeader),
		getBlogReadRankings({ request, forceFresh: true }).then(getRankingLeader),
	])

	if (
		afterPostLeader?.team &&
		afterPostLeader.team !== beforePostLeader?.team
	) {
		// fire and forget notification because the user doesn't care whether this finishes
		void notifyOfTeamLeaderChangeOnPost({
			request,
			postSlug: slug,
			reader: user,
			newLeader: afterPostLeader.team,
			prevLeader: beforePostLeader?.team,
		})
	}
	if (
		afterOverallLeader?.team &&
		afterOverallLeader.team !== beforeOverallLeader?.team
	) {
		// fire and forget notification because the user doesn't care whether this finishes
		void notifyOfOverallTeamLeaderChange({
			request,
			postSlug: slug,
			reader: user,
			newLeader: afterOverallLeader.team,
			prevLeader: beforeOverallLeader?.team,
		})
	}

	return json({ success: true })
}

export async function markAsRead({ slug }: { slug: string }) {
	return fetch('/action/mark-as-read', {
		method: 'POST',
		body: new URLSearchParams({ slug }),
	})
}
