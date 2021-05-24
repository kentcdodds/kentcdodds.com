import type {Request, LoaderFunction, Session} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import {UserData} from 'types'
import {
  getMagicLink,
  getUserByEmail,
  getUserFromToken,
  getSessionTokenFromMagicLink,
} from './firebase.server'
import {sendMagicLinkEmail} from './send-email.server'

const sessionTokenKey = 'token'

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
  const confirmationLink = await getMagicLink(emailAddress)

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

  const token = session.get(sessionTokenKey) as string | undefined
  if (!token) return null

  return getUserFromToken(token).catch(() => {
    return null
  })
}

function signOutSession(session: Session) {
  session.unset(sessionTokenKey)
}

async function loginSessionWithMagicLink(
  session: Session,
  {emailAddress, link}: {emailAddress: string; link: string},
) {
  const sessionToken = await getSessionTokenFromMagicLink({
    emailAddress,
    link,
  })
  session.set(sessionTokenKey, sessionToken)
}

function requireUser(request: Request) {
  return async (loader: (data: UserData) => ReturnType<LoaderFunction>) => {
    const userInfo = await getUser(request)
    if (!userInfo) {
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      const cookie = await rootStorage.destroySession(session)
      return redirect('/login', {headers: {'Set-Cookie': cookie}})
    }
    return loader(userInfo)
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
