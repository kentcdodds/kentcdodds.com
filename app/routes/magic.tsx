import type {LoaderFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import * as React from 'react'
import {
  getSessionToken,
  rootStorage,
  verifySignInLink,
  signInSession,
} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const code = params.get('oobCode')
  const continueUrl = params.get('continueUrl')
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const email = session.get('email') as string | null

  if (!email || !code || mode !== 'signIn') {
    session.flash('error', 'Sign in link invalid. Please request a new one.')
    return redirect('/login', {
      headers: {'Set-Cookie': await rootStorage.commitSession(session)},
    })
  }

  const idToken = await verifySignInLink({
    emailAddress: email,
    link: request.url,
  })
  signInSession(session, await getSessionToken(idToken))
  const cookie = await rootStorage.commitSession(session, {maxAge: 604_800})
  return redirect(continueUrl ?? '/me', {
    headers: {'Set-Cookie': cookie},
  })
}

export default function Magic() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
