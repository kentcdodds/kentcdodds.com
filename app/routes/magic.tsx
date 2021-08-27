import type {LoaderFunction} from 'remix'
import {redirect, Headers} from 'remix'
import type {KCDHandle} from '~/types'
import * as React from 'react'
import {getLoginInfoSession} from '~/utils/login.server'
import {getUserSessionFromMagicLink} from '~/utils/session.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const loader: LoaderFunction = async ({request}) => {
  const loginInfoSession = await getLoginInfoSession(request)
  try {
    const session = await getUserSessionFromMagicLink(request)
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
