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

async function getUser(request: Request) {
  const sessionUser = await getUserSession(request)
  if (!sessionUser) {
    return null
  }
  const usersRef = getDb().collection('users')
  const userDoc = await usersRef.doc(sessionUser.uid).get()
  if (!userDoc.exists) {
    // this should never happen, log the user out
    console.error(`No user doc for this session: ${sessionUser.uid}`)
    return null
  }
  const user = {uid: userDoc.id, ...userDoc.data()}
  return {sessionUser, user, userDoc}
}

function requireUser(request: Request) {
  return async (
    loader: (data: {
      sessionUser: admin.auth.DecodedIdToken | null
      user: {uid: string}
      userDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
    }) => ReturnType<Loader>,
  ) => {
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

export {rootStorage, createUserSession, requireUser, getUserSession, getUser}
