import type {Request, Response, Session} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import type {User} from '@prisma/client'
import {sendMagicLinkEmail} from './send-email.server'
import {
  getUserByEmail,
  getMagicLink,
  getUserFromSessionId,
  prisma,
  replayable,
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

const rootStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: [rootSessionSecret],
    sameSite: 'lax',
    path: '/',
    expires: new Date('2088-10-19'),
  },
})

async function sendToken({
  emailAddress,
  domainUrl,
}: {
  emailAddress: string
  domainUrl: string
}) {
  const confirmationLink = getMagicLink({emailAddress, domainUrl})

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
    session.unset(sessionIdKey)
    console.error(`Failure getting user from session ID:`, error)
    return null
  })
}

async function signOutSession(session: Session) {
  const sessionId = session.get(sessionIdKey)
  session.unset(sessionIdKey)
  if (sessionId) {
    prisma.session.delete({where: {id: sessionId}}).catch((error: unknown) => {
      console.error(`Failure deleting user session: `, error)
      return null
    })
  }
}

async function signInSession(session: Session, sessionId: string) {
  session.set(sessionIdKey, sessionId)
}

async function requireAdminUser(
  request: Request,
  callback: (data: User) => Response | Promise<Response>,
): Promise<Response> {
  return replayable(request, async () => {
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
    return callback(user)
  })
}

async function requireUser(
  request: Request,
  callback: (data: User) => Response | Promise<Response>,
): Promise<Response> {
  return replayable(request, async () => {
    const user = await getUser(request)
    if (!user) {
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      await signOutSession(session)
      const cookie = await rootStorage.commitSession(session)
      return redirect('/login', {headers: {'Set-Cookie': cookie}})
    }
    return callback(user)
  })
}

export const sessionKeys = {
  magicLink: 'magicLink',
  email: 'email',
}

export {
  rootStorage,
  requireUser,
  requireAdminUser,
  getUserRequestToken,
  validateUserRequestToken,
  getUser,
  sendToken,
  signInSession,
  signOutSession,
}
