import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { getAllUserData } from '#app/utils/prisma.server.ts'
import { requireUser } from '#app/utils/session.server.ts'
import { getUserInfo } from '#app/utils/user-info.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request)

	const sqlite = await getAllUserData(user.id)
	const cache = await getUserInfo(user, { request })
	return json({ sqlite, cache })
}
