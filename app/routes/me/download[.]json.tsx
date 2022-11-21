import type {LoaderFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {getAllUserData} from '~/utils/prisma.server'
import {requireUser} from '~/utils/session.server'
import {getUserInfo} from '~/utils/user-info.server'

export const loader: LoaderFunction = async ({request}) => {
  const user = await requireUser(request)

  const sqlite = await getAllUserData(user.id)
  const cache = await getUserInfo(user, {request})
  return json({sqlite, cache})
}
