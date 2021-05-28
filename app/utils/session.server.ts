import type {Request, LoaderFunction, Session} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import type {User} from '@prisma/client'
import {sendMagicLinkEmail} from './send-email.server'
import {
  getUserByEmail,
  getMagicLink,
  getSessionIdFromMagicLink,
  getUserFromSessionId,
  deleteUserSession,
} from './prisma.server'

const sessionIdKey = '__session_id__'

let secret = 'not-at-all-secret'
if (process.env.SESSION_SECRET) {
  secret = process.env.SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set SESSION_SECRET')
}

const rootStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [secret],
    sameSite: 'lax',
    path: '/',
  },
})

async function sendToken(emailAddress: string) {
  const confirmationLink = getMagicLink(emailAddress)

  const user = await getUserByEmail(emailAddress).catch(() => {
    /* ignore... */
  })

  await sendMagicLinkEmail({
    emailAddress,
    confirmationLink,
    userExists: Boolean(user),
  })
}

async function getUser(request: Request) {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) return null

  return getUserFromSessionId(token).catch((error: unknown) => {
    console.error(error)
    return null
  })
}

async function signOutSession(session: Session) {
  const sessionId = session.get(sessionIdKey)
  session.unset(sessionIdKey)
  if (sessionId) {
    await deleteUserSession(sessionId)
  }
}

async function loginSessionWithMagicLink(
  session: Session,
  {emailAddress, link}: {emailAddress: string; link: string},
) {
  const sessionId = await getSessionIdFromMagicLink(emailAddress, link)
  session.set(sessionIdKey, sessionId)
}

function requireUser(request: Request) {
  return async (loader: (data: User) => ReturnType<LoaderFunction>) => {
    const user = await getUser(request)
    if (!user) {
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      const cookie = await rootStorage.destroySession(session)
      return redirect('/login', {headers: {'Set-Cookie': cookie}})
    }
    return loader(user)
  }
}

export {
  rootStorage,
  requireUser,
  getUser,
  sendToken,
  loginSessionWithMagicLink,
  signOutSession,
}
