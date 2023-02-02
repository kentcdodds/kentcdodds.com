import {createCookieSessionStorage, redirect} from '@remix-run/node'
import type {User} from '@prisma/client'
import {sendMagicLinkEmail} from './send-email.server'
import {
  prisma,
  getMagicLink,
  getUserFromSessionId,
  validateMagicLink,
  createSession,
  sessionExpirationTime,
} from './prisma.server'
import {getRequiredServerEnvVar} from './misc'
import {getLoginInfoSession} from './login.server'
import {ensurePrimary} from 'litefs-js/remix'
import type {Timings} from './timing.server'

const sessionIdKey = '__session_id__'

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_root_session',
    secure: true,
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    maxAge: sessionExpirationTime / 1000,
    httpOnly: true,
  },
})

async function sendToken({
  emailAddress,
  domainUrl,
}: {
  emailAddress: string
  domainUrl: string
}) {
  const magicLink = getMagicLink({
    emailAddress,
    validateSessionMagicLink: true,
    domainUrl,
  })

  const user = await prisma.user
    .findUnique({where: {email: emailAddress}})
    .catch(() => {
      /* ignore... */
      return null
    })

  await sendMagicLinkEmail({
    emailAddress,
    magicLink,
    user,
    domainUrl,
  })
  return magicLink
}

async function getSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const initialValue = await sessionStorage.commitSession(session)
  const getSessionId = () => session.get(sessionIdKey) as string | undefined
  const unsetSessionId = () => session.unset(sessionIdKey)

  const commit = async () => {
    const currentValue = await sessionStorage.commitSession(session)
    return currentValue === initialValue ? null : currentValue
  }
  return {
    session,
    getUser: async ({timings}: {timings?: Timings} = {}) => {
      const token = getSessionId()
      if (!token) return null

      return getUserFromSessionId(token, {timings}).catch((error: unknown) => {
        unsetSessionId()
        console.error(`Failure getting user from session ID:`, error)
        return null
      })
    },
    getSessionId,
    unsetSessionId,
    signIn: async (user: Pick<User, 'id'>) => {
      const userSession = await createSession({userId: user.id})
      session.set(sessionIdKey, userSession.id)
    },
    signOut: async () => {
      const sessionId = getSessionId()
      if (sessionId) {
        await ensurePrimary()
        unsetSessionId()
        prisma.session
          .delete({where: {id: sessionId}})
          .catch((error: unknown) => {
            console.error(`Failure deleting user session: `, error)
          })
      }
    },
    commit,
    /**
     * This will initialize a Headers object if one is not provided.
     * It will set the 'Set-Cookie' header value on that headers object.
     * It will then return that Headers object.
     */
    getHeaders: async (headers: ResponseInit['headers'] = new Headers()) => {
      const value = await commit()
      if (!value) return headers
      if (headers instanceof Headers) {
        headers.append('Set-Cookie', value)
      } else if (Array.isArray(headers)) {
        headers.push(['Set-Cookie', value])
      } else {
        headers['Set-Cookie'] = value
      }
      return headers
    },
  }
}

async function deleteOtherSessions(request: Request) {
  const {session} = await getSession(request)

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) {
    console.warn(
      `Trying to delete other sessions, but the request came from someone who has no sessions`,
    )
    return
  }
  const user = await getUserFromSessionId(token)
  await ensurePrimary()
  await prisma.session.deleteMany({
    where: {userId: user.id, NOT: {id: token}},
  })
}

async function getUser(request: Request, {timings}: {timings?: Timings} = {}) {
  const {session} = await getSession(request)

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) return null

  return getUserFromSessionId(token, {timings}).catch((error: unknown) => {
    console.error(`Failure getting user from session ID:`, error)
    return null
  })
}

async function getUserSessionFromMagicLink(request: Request) {
  const loginInfoSession = await getLoginInfoSession(request)
  const email = await validateMagicLink(
    request.url,
    loginInfoSession.getMagicLink(),
  )

  const user = await prisma.user.findUnique({where: {email}})
  if (!user) return null

  const session = await getSession(request)
  await session.signIn(user)
  return session
}

async function requireAdminUser(request: Request): Promise<User> {
  const user = await getUser(request)
  if (!user) {
    const session = await getSession(request)
    await session.signOut()
    throw redirect('/login', {headers: await session.getHeaders()})
  }
  if (user.role !== 'ADMIN') {
    throw redirect('/')
  }
  return user
}

async function requireUser(
  request: Request,
  {timings}: {timings?: Timings} = {},
): Promise<User> {
  const user = await getUser(request, {timings})
  if (!user) {
    const session = await getSession(request)
    await session.signOut()
    throw redirect('/login', {headers: await session.getHeaders()})
  }
  return user
}

export {
  getSession,
  deleteOtherSessions,
  getUserSessionFromMagicLink,
  requireUser,
  requireAdminUser,
  getUser,
  sendToken,
}
