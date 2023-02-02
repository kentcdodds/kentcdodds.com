import type {DataFunctionArgs} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import type {KCDHandle} from '~/types'

import {getLoginInfoSession} from '~/utils/login.server'
import {getUserSessionFromMagicLink} from '~/utils/session.server'
import {getErrorMessage, isResponse} from '~/utils/misc'
import {getClientSession} from '~/utils/client.server'
import {prisma} from '~/utils/prisma.server'
import {ensurePrimary} from 'litefs-js/remix'
export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export async function loader({request}: DataFunctionArgs) {
  await ensurePrimary()
  const loginInfoSession = await getLoginInfoSession(request)
  try {
    const session = await getUserSessionFromMagicLink(request)
    loginInfoSession.setMagicLinkVerified(true)
    if (session) {
      const headers = new Headers()
      loginInfoSession.clean()
      await loginInfoSession.getHeaders(headers)
      await session.getHeaders(headers)
      const user = await session.getUser()
      if (user) {
        const clientSession = await getClientSession(request, null)
        // update all PostReads from clientId to userId
        const clientId = clientSession.getClientId()
        if (clientId) {
          await prisma.postRead.updateMany({
            data: {userId: user.id, clientId: null},
            where: {clientId},
          })
          clientSession.setUser(user)
          await clientSession.getHeaders(headers)
        }
      } else {
        // This shouldn't happen, but if it does, we'll handle it when we redirect to /me
      }
      return redirect('/me', {headers})
    } else {
      loginInfoSession.setMagicLink(request.url)
      return redirect('/signup', {
        headers: await loginInfoSession.getHeaders(),
      })
    }
  } catch (error: unknown) {
    if (isResponse(error)) throw error

    console.error(error)
    loginInfoSession.clean()
    loginInfoSession.flashError(
      getErrorMessage(error) ||
        'Sign in link invalid. Please request a new one.',
    )
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders(),
    })
  }
}

export default function Magic() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
