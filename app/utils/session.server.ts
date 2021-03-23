import type {Request, Loader} from '@remix-run/data'
import {redirect} from '@remix-run/data'
import {admin, getDb} from './firebase.server'
import {rootStorage} from './sessions'

export async function getCustomer(request: Request) {
  const usersRef = getDb().collection('users')
  const sessionUser = await getUserSession(request)
  if (!sessionUser) {
    return null
  }
  const userDoc = await usersRef.doc(sessionUser.uid).get()
  if (!userDoc.exists) {
    return null
  }
  const user = userDoc.data()
  return {sessionUser, user}
}

export function requireCustomer(request: Request) {
  return async (
    loader: (data: {
      sessionUser: admin.auth.DecodedIdToken | null
      user: {uid: string}
    }) => ReturnType<Loader>,
  ) => {
    const usersRef = getDb().collection('users')
    const sessionUser = await getUserSession(request)
    if (!sessionUser) return redirect('/login')

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
