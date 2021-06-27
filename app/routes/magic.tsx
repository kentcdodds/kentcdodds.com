import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {rootStorage, signInSession} from '../utils/session.server'
import {
  createSession,
  getUserByEmail,
  validateMagicLink,
} from '../utils/prisma.server'
import {getErrorMessage} from '../utils/misc'

export const loader: LoaderFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const validationEmail = session.get('email') as string | null

  try {
    const email = await validateMagicLink(validationEmail, request.url)

    const user = await getUserByEmail(email)
    if (user) {
      const userSession = await createSession({userId: user.id})
      await signInSession(session, userSession.id)

      const cookie = await rootStorage.commitSession(session, {maxAge: 604_800})
      return redirect('/me', {
        headers: {'Set-Cookie': cookie},
      })
    } else {
      session.set('magicLink', request.url)
      return redirect('/signup', {
        headers: {'Set-Cookie': await rootStorage.commitSession(session)},
      })
    }
  } catch (error: unknown) {
    console.error(getErrorMessage(error))

    session.flash('error', 'Sign in link invalid. Please request a new one.')
    return redirect('/login', {
      headers: {'Set-Cookie': await rootStorage.commitSession(session)},
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
