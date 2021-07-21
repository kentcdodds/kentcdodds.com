import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {rootStorage, sessionKeys, signInSession} from '../utils/session.server'
import {
  createSession,
  getUserByEmail,
  replayable,
  validateMagicLink,
} from '../utils/prisma.server'

export const loader: LoaderFunction = async ({request}) => {
  return replayable(request, async checkIfReplayable => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))

    try {
      const email = await validateMagicLink(request.url)

      const user = await getUserByEmail(email)
      if (user) {
        const userSession = await createSession({userId: user.id})
        await signInSession(session, userSession.id)

        const cookie = await rootStorage.commitSession(session, {
          maxAge: 604_800,
        })
        return redirect('/me', {
          headers: {'Set-Cookie': cookie},
        })
      } else {
        session.set(sessionKeys.magicLink, request.url)
        return redirect('/signup', {
          headers: {'Set-Cookie': await rootStorage.commitSession(session)},
        })
      }
    } catch (error: unknown) {
      const replay = checkIfReplayable(error)
      if (replay) return replay

      console.error(error)

      session.flash('error', 'Sign in link invalid. Please request a new one.')
      return redirect('/login', {
        headers: {'Set-Cookie': await rootStorage.commitSession(session)},
      })
    }
  })
}

export default function Magic() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
