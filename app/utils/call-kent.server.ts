import {createCookieSessionStorage} from 'remix'

let callKentSessionSecret = 'not-even-a-little-secret'
if (process.env.CALL_KENT_SESSION_SECRET) {
  callKentSessionSecret = process.env.CALL_KENT_SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set CALL_KENT_SESSION_SECRET')
}

const callKentStorage = createCookieSessionStorage({
  cookie: {
    name: '__call_kent_session',
    secrets: [callKentSessionSecret],
    sameSite: 'lax',
    path: '/call',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
  },
})
export {callKentStorage}
