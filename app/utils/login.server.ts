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
    httpOnly: true,
  },
})

async function getLoginInfoSession(request: Request) {
  const session = await loginInfoStorage.getSession(
    request.headers.get('Cookie'),
  )
  const initialValue = await loginInfoStorage.commitSession(session)

  const commit = async () => {
    const currentValue = await loginInfoStorage.commitSession(session)
    return currentValue === initialValue ? null : currentValue
  }
  return {
    getEmail: () => session.get('email') as string | undefined,
    setEmail: (email: string) => session.set('email', email),
    getMagicLink: () => session.get('magicLink') as string | undefined,
    setMagicLink: (magicLink: string) => session.set('magicLink', magicLink),
    unsetMagicLink: () => session.unset('magicLink'),
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
    destroy: () => loginInfoStorage.destroySession(session),
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

export {getLoginInfoSession}
