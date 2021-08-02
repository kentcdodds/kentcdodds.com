import type {Request, Response} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import type {User} from '@prisma/client'
import {sendMagicLinkEmail} from './send-email.server'
import {
  getUserByEmail,
  getMagicLink,
  getUserFromSessionId,
  prisma,
  validateMagicLink,
  createSession,
  sessionExpirationTime,
} from './prisma.server'
import {getRequiredServerEnvVar} from './misc'

const sessionIdKey = '__session_id__'

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_root_session',
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    maxAge: sessionExpirationTime,
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

async function getSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const getSessionId = () => session.get(sessionIdKey) as string | undefined
  const unsetSessionId = () => session.unset(sessionIdKey)
  return {
    session,
    getSessionId,
    unsetSessionId,
    singIn: async (user: User) => {
      const userSession = await createSession({userId: user.id})
      session.set(sessionIdKey, userSession.id)
    },
    signOut: () => {
      const sessionId = getSessionId()
      if (sessionId) {
        unsetSessionId()
        prisma.session
          .delete({where: {id: sessionId}})
          .catch((error: unknown) => {
            console.error(`Failure deleting user session: `, error)
          })
      }
    },
    destroy: () => sessionStorage.destroySession(session),
    commit: () => sessionStorage.commitSession(session),
  }
}

async function getUser(request: Request) {
  const {session} = await getSession(request)

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) return null

  return getUserFromSessionId(token).catch((error: unknown) => {
    console.error(`Failure getting user from session ID:`, error)
    return null
  })
}

async function getUserSessionCookieFromMagicLink(request: Request) {
  const email = await validateMagicLink(request.url)

  const user = await getUserByEmail(email)
  if (!user) return null

  const cookie = await getUserSessionCookieForUser(request, user)
  return cookie
}

async function getUserSessionCookieForUser(request: Request, user: User) {
  const session = await getSession(request)
  await session.singIn(user)

  const cookie = await session.commit()
  return cookie
}

async function requireAdminUser(
  request: Request,
  callback: (data: User) => Response | Promise<Response>,
): Promise<Response> {
  const user = await getUser(request)
  if (!user) {
    const session = await getSession(request)
    session.signOut()
    return redirect('/login', {headers: {'Set-Cookie': await session.commit()}})
  }
  if (user.role !== 'ADMIN') {
    return redirect('/')
  }
  return callback(user)
}

async function requireUser(
  request: Request,
  callback: (data: User) => Response | Promise<Response>,
): Promise<Response> {
  const user = await getUser(request)
  if (!user) {
    const session = await getSession(request)
    session.signOut()
    return redirect('/login', {headers: {'Set-Cookie': await session.commit()}})
  }
  return callback(user)
}

export {
  getSession,
  getUserSessionCookieFromMagicLink,
  getUserSessionCookieForUser,
  requireUser,
  requireAdminUser,
  getUser,
  sendToken,
}
