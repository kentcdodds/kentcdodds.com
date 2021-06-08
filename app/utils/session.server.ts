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
import {encrypt, decrypt} from './encryption.server'
import {getErrorMessage} from './misc'

const sessionIdKey = '__session_id__'

let rootSessionSecret = 'not-at-all-secret'
if (process.env.SESSION_SECRET) {
  rootSessionSecret = process.env.SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set SESSION_SECRET')
}

let actionSessionSecret = 'super-unsecret'
if (process.env.ACTION_SESSION_SECRET) {
  actionSessionSecret = process.env.ACTION_SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set ACTION_SESSION_SECRET')
}

const rootStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [rootSessionSecret],
    sameSite: 'lax',
    path: '/',
  },
})

const actionStorage = createCookieSessionStorage({
  cookie: {
    name: '__action_session',
    secrets: [actionSessionSecret],
    sameSite: 'lax',
    path: '/action',
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

async function getUserRequestToken(userId: string) {
  return encrypt(JSON.stringify({type: 'request', userId}))
}

async function validateUserRequestToken(token: string, userId: string) {
  try {
    const tokenObj = JSON.parse(decrypt(token))
    return tokenObj.type === 'request' && tokenObj.userId === userId
  } catch (error: unknown) {
    console.error(getErrorMessage(error))
    return false
  }
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

function requireAdminUser(request: Request) {
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
    if (user.role !== 'ADMIN') {
      return redirect('/')
    }
    return loader(user)
  }
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

export {
  rootStorage,
  actionStorage,
  requireUser,
  requireAdminUser,
  getUserRequestToken,
  validateUserRequestToken,
  getUser,
  sendToken,
  signInSession,
  signOutSession,
}
