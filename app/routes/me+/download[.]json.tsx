import { json, type LoaderFunction } from '@remix-run/node'
import { getAllUserData } from '~/utils/prisma.server.ts'
import { requireUser } from '~/utils/session.server.ts'
import { getUserInfo } from '~/utils/user-info.server.ts'

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request)

	const sqlite = await getAllUserData(user.id)
	const cache = await getUserInfo(user, { request })
	return json({ sqlite, cache })
}
