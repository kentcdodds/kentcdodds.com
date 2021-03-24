import type {Request, Loader} from '@remix-run/data'
import {createCookieSessionStorage, redirect} from '@remix-run/data'
import {admin, getDb, getSessionToken} from './firebase.server'

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

async function createUserSession(idToken: string) {
  const {getSession, commitSession} = rootStorage
  const token = await getSessionToken(idToken)
  const session = await getSession()
  session.set('token', token)
  const cookie = await commitSession(session, {maxAge: 604_800})
  return redirect('/me', {
    headers: {'Set-Cookie': cookie},
  })
}

async function getCustomer(request: Request) {
  const sessionUser = await getUserSession(request)
  if (!sessionUser) {
    return null
  }
  const usersRef = getDb().collection('users')
  const userDoc = await usersRef.doc(sessionUser.uid).get()
  if (!userDoc.exists) {
    return null
  }
  const user = userDoc.data()
  return {sessionUser, user}
}

function requireCustomer(request: Request) {
  return async (
    loader: (data: {
      sessionUser: admin.auth.DecodedIdToken | null
      user: {uid: string}
    }) => ReturnType<Loader>,
  ) => {
    const sessionUser = await getUserSession(request)
    if (!sessionUser) return redirect('/login')

    const usersRef = getDb().collection('users')
    const userDoc = await usersRef.doc(sessionUser.uid).get()
    // weird to have a session but not a user doc, should be impossible but who
    // knows, just being extra careful, send them to the buy page!
    if (!userDoc.exists) return redirect('/buy')

    const user = {uid: userDoc.id, ...userDoc.data()}
    const data = {sessionUser, user}
    return loader(data)
  }
}

async function getUserSession(request: Request) {
  const cookieSession = await rootStorage.getSession(
    request.headers.get('Cookie'),
  )
  const token = cookieSession.get('token')
  if (!token) return null
  try {
    const tokenUser = await admin.auth().verifySessionCookie(token, true)
    return tokenUser
  } catch {
    return null
  }
}

export {
  rootStorage,
  createUserSession,
  requireCustomer,
  getUserSession,
  getCustomer,
}
