import {createCookieSessionStorage} from '@remix-run/data'

const {getSession, commitSession, destroySession} = createCookieSessionStorage({
  cookie: {
    name: '__session',
    // TODO: make this an environment variable
    secrets: ['r3m1xr0ck5'],
    sameSite: 'lax',
  },
})

export {getSession, commitSession, destroySession}
