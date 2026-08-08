import { invariantResponse } from '@epic-web/invariant'
import { data as json } from 'react-router'
import {
	addPostRead,
	getBlogReadRankings,
	notifyOfOverallTeamLeaderChange,
	notifyOfTeamLeaderChangeOnPost,
} from '#app/utils/blog.server.ts'
import { getRankingLeader } from '#app/utils/blog.ts'
import { getClientSession } from '#app/utils/client.server.ts'
import { getSession } from '#app/utils/session.server.ts'
import { type Route } from './+types/mark-as-read'

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const slug = formData.get('slug')
	invariantResponse(typeof slug === 'string', 'Missing slug')
	const session = await getSession(request)
	const user = await session.getUser()

	const [beforePostLeader, beforeOverallLeader] = await Promise.all([
		getBlogReadRankings({ request, slug }).then(getRankingLeader),
		getBlogReadRankings({ request }).then(getRankingLeader),
	])
	let createdPostRead = null
	if (user) {
		createdPostRead = await addPostRead({
			slug,
			userId: user.id,
		})
	} else {
		const client = await getClientSession(request, user)
		const clientId = client.getClientId()
		if (clientId) {
			createdPostRead = await addPostRead({ slug, clientId })
		}
	}

	// Rankings only change when a new PostRead row was actually created
	// (addPostRead dedupes repeat reads within a week). Skip the forceFresh
	// recompute otherwise: it bypasses the shared cache and re-runs 9 heavy
	// PostRead aggregate queries per ranking, which is the expensive part of
	// D1's rows-read billing.
	if (!createdPostRead) {
		return json({ success: true })
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

/**
 * Best-effort read tracking. Offline / tab-close / flaky mobile networks reject
 * `fetch` with TypeError (Chrome "Failed to fetch", Safari "Load failed",
 * Firefox "NetworkError…") — catch so callers' `void markAsRead()` does not
 * surface as onunhandledrejection (KCD-FY / KCD-1R / KCD-ZW / KCD-WV).
 */
export async function markAsRead({ slug }: { slug: string }) {
	try {
		return await fetch('/action/mark-as-read', {
			method: 'POST',
			body: new URLSearchParams({ slug }),
		})
	} catch {
		return undefined
	}
}
