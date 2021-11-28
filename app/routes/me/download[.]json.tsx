import type {LoaderFunction} from 'remix'
import {json} from 'remix'
import {getAllUserData} from '~/utils/prisma.server'
import {requireUser} from '~/utils/session.server'
import {getUserInfo} from '~/utils/user-info.server'

export const loader: LoaderFunction = async ({request}) => {
  const user = await requireUser(request)

  const postgres = await getAllUserData(user.id)
  const cache = await getUserInfo(user, {request})
  return json({postgres, cache})
}
