import {createCookieSessionStorage, redirect} from '@remix-run/data'
import {getSessionToken} from './firebase.server'

export const rootStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: ['woo-remix'],
    sameSite: 'lax',
    path: '/',
  },
})

export async function createUserSession(idToken: string) {
  const {getSession, commitSession} = rootStorage
  const token = await getSessionToken(idToken)
  const session = await getSession()
  session.set('token', token)
  const cookie = await commitSession(session, {maxAge: 604_800})
  return redirect('/you', {
    headers: {'Set-Cookie': cookie},
  })
}
