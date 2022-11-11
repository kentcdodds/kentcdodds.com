import type {DataFunctionArgs} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import type {KCDHandle} from '~/types'
import * as React from 'react'
import {getLoginInfoSession} from '~/utils/login.server'
import {getUserSessionFromMagicLink} from '~/utils/session.server'
import {getErrorMessage} from '~/utils/misc'
export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export async function loader({request}: DataFunctionArgs) {
  const loginInfoSession = await getLoginInfoSession(request)
  try {
    const session = await getUserSessionFromMagicLink(request)
    loginInfoSession.setMagicLinkVerified(true)
    if (session) {
      const headers = new Headers()
      loginInfoSession.clean()
      await loginInfoSession.getHeaders(headers)
      await session.getHeaders(headers)
      return redirect('/me', {headers})
    } else {
      loginInfoSession.setMagicLink(request.url)
      return redirect('/signup', {
        headers: await loginInfoSession.getHeaders(),
      })
    }
  } catch (error: unknown) {
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
