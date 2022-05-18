import {createCookieSessionStorage} from '@remix-run/node'
import {decrypt, encrypt} from './encryption.server'
import {getRequiredServerEnvVar} from './misc'
import {linkExpirationTime} from './prisma.server'

const loginInfoStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_login',
    secure: true,
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    maxAge: linkExpirationTime / 1000,
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

    // NOTE: the magic link needs to be encrypted in the session because the
    // end user can access the cookie and see the plaintext magic link which
    // would allow them to login as any user 😬
    getMagicLink: () => {
      const link = session.get('magicLink') as string | undefined
      if (link) return decrypt(link)
    },
    setMagicLink: (magicLink: string) =>
      session.set('magicLink', encrypt(magicLink)),
    unsetMagicLink: () => session.unset('magicLink'),
    getMagicLinkVerified: () =>
      session.get('magicLinkVerified') as boolean | undefined,
    setMagicLinkVerified: (verified: boolean) =>
      session.set('magicLinkVerified', verified),
    unsetMagicLinkVerified: () => session.unset('magicLinkVerified'),
    getError: () => session.get('error') as string | undefined,
    flashError: (error: string) => session.flash('error', error),
    clean: () => {
      session.unset('email')
      session.unset('magicLink')
      session.unset('error')
      session.unset('magicLinkVerified')
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
