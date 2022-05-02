import {CookieSerializeOptions, createCookieSessionStorage} from 'remix'
import {getRequiredServerEnvVar} from './misc'

const storage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_spring_sale_message',
    secure: true,
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    // expires when the sale is over
    expires: new Date('2022-05-18'),
    httpOnly: true,
  },
})

async function getKCDSpringSaleSession(request: Request) {
  const session = await storage.getSession(request.headers.get('Cookie'))
  const initialValue = await storage.commitSession(session)
  async function commit(options?: CookieSerializeOptions) {
    const currentValue = await storage.commitSession(session, options)
    return currentValue === initialValue ? null : currentValue
  }

  return {
    storage,
    getDismissed() {
      const dismissed = session.get('dismissed')
      return dismissed === 'true'
    },
    setDismissed() {
      session.set('dismissed', 'true')
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

export {getKCDSpringSaleSession}
