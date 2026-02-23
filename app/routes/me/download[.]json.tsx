import { data as json } from 'react-router'
import { getAllUserData } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { getUserInfo } from '#app/utils/user-info.server.ts'
import { type Route } from './+types/download[.]json'

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)

	const sqlite = await getAllUserData(user.id)
	const cache = await getUserInfo(user, { request })
	return json({ sqlite, cache })
}
