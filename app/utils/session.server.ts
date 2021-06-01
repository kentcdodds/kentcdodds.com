import type {Request, LoaderFunction, Session} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import type {User} from '@prisma/client'
import {sendMagicLinkEmail} from './send-email.server'
import {
  getUserByEmail,
  getMagicLink,
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
    console.error(`Failure getting user from session ID:`, error)
    return null
  })
}

async function signOutSession(session: Session) {
  const sessionId = session.get(sessionIdKey)
  session.unset(sessionIdKey)
  if (sessionId) {
    deleteUserSession(sessionId).catch((error: unknown) => {
      console.error(`Failure deleting user session: `, error)
      return null
    })
  }
}

async function signInSession(session: Session, sessionId: string) {
  session.set(sessionIdKey, sessionId)
}

function requireUser(request: Request) {
  return async (loader: (data: User) => ReturnType<LoaderFunction>) => {
    const user = await getUser(request)
    if (!user) {
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      await signOutSession(session)
      const cookie = await rootStorage.commitSession(session)
      return redirect('/login', {headers: {'Set-Cookie': cookie}})
    }
    return loader(user)
  }
}

function optionalUser(request: Request) {
  return async (loader: (data: User | null) => ReturnType<LoaderFunction>) => {
    return loader(await getUser(request))
  }
}

export {
  rootStorage,
  requireUser,
  optionalUser,
  getUser,
  sendToken,
  signInSession,
  signOutSession,
}
