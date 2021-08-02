import type {Request} from 'remix'
import {createCookieSessionStorage} from 'remix'
import {getRequiredServerEnvVar} from './misc'
import {linkExpirationTime} from './prisma.server'

const loginInfoStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_login',
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    maxAge: linkExpirationTime,
  },
})

async function getLoginInfoSession(request: Request) {
  const session = await loginInfoStorage.getSession(
    request.headers.get('Cookie'),
  )
  return {
    getEmail: () => session.get('email') as string | undefined,
    setEmail: (email: string) => session.set('email', email),
    getMagicLink: () => session.get('magicLink') as string | undefined,
    setMagicLink: (magicLink: string) => session.set('magicLink', magicLink),
    getError: () => session.get('error') as string | undefined,
    flashError: (error: string) => session.flash('error', error),
    getMessage: () => session.get('message') as string | undefined,
    flashMessage: (message: string) => session.flash('message', message),
    clean: () => {
      session.unset('email')
      session.unset('magicLink')
      session.unset('error')
      session.unset('message')
    },
    commit: () => loginInfoStorage.commitSession(session),
    destroy: () => loginInfoStorage.destroySession(session),
  }
}

export {getLoginInfoSession}
