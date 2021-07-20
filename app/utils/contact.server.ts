import {createCookieSessionStorage} from 'remix'

let contactSessionSecret = 'not-even-a-little-secret'
if (process.env.CONTACT_SESSION_SECRET) {
  contactSessionSecret = process.env.CONTACT_SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set CONTACT_SESSION_SECRET')
}

const contactStorage = createCookieSessionStorage({
  cookie: {
    name: '__contact_session',
    secrets: [contactSessionSecret],
    sameSite: 'lax',
    path: '/contact',
    expires: new Date('2088-10-18'),
  },
})

export {contactStorage}
