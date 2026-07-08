import pProps from 'p-props'
import { data as json } from 'react-router'
import { db } from '#app/utils/db.server.ts'
import {
	callKentCallerEpisodeTable,
	callTable,
	favoriteTable,
	postReadTable,
	sessionTable,
	userTable,
} from '#app/utils/db/schema.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { getUserInfo } from '#app/utils/user-info.server.ts'
import { type Route } from './+types/download[.]json'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)

	const sqlite = await pProps({
		user: db.find(userTable, user.id),
		calls: db.findMany(callTable, { where: { userId: user.id } }),
		callKentCallerEpisodes: db.findMany(callKentCallerEpisodeTable, {
			where: { userId: user.id },
		}),
		favorites: db.findMany(favoriteTable, { where: { userId: user.id } }),
		postReads: db.findMany(postReadTable, { where: { userId: user.id } }),
		sessions: db.findMany(sessionTable, { where: { userId: user.id } }),
	})
	const cache = await getUserInfo(user, { request })
	return json({ sqlite, cache })
}
