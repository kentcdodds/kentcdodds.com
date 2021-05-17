import type {Request, LoaderFunction, Session} from 'remix'
import {createCookieSessionStorage, redirect} from 'remix'
import {getDb, getAuth, firebase} from './firebase.server'
import type {SessionUser} from './firebase.server'
import {sendMagicLinkEmail} from './send-email'

type UserData = {
  uid: string
  firstName: string
  team: string
}

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

async function sendToken(emailAddress: string) {
  const confirmationLink = await getAuth().generateSignInWithEmailLink(
    emailAddress,
    {handleCodeInApp: true, url: 'https://kentcdodds.com/me'},
  )

  const user = await getAuth()
    .getUserByEmail(emailAddress)
    .catch(() => {
      /* ignore... */
    })

  await sendMagicLinkEmail({
    emailAddress,
    confirmationLink,
    userExists: Boolean(user),
  })
}

async function getSessionToken(idToken: string) {
  const auth = getAuth()
  const decodedToken = await auth.verifyIdToken(idToken)
  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error('Recent sign in required')
  }
  const twoWeeks = 60 * 60 * 24 * 14 * 1000
  return auth.createSessionCookie(idToken, {expiresIn: twoWeeks})
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
  const user = {uid: userDoc.id, ...userDoc.data()} as UserData
  return {sessionUser, user, userDoc}
}

async function verifySignInLink({
  emailAddress,
  link,
}: {
  emailAddress: string
  link: string
}) {
  const result = await firebase.auth().signInWithEmailLink(emailAddress, link)
  if (!result.user) {
    throw new Error('Link validation failed')
  }
  return result.user.getIdToken()
}

function signOutSession(session: Session) {
  session.unset('token')
}

function signInSession(session: Session, token: string) {
  session.set('token', token)
}

function requireUser(request: Request) {
  return async (
    loader: (data: {
      sessionUser: SessionUser
      user: UserData
      userDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
    }) => ReturnType<LoaderFunction>,
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
  const token = cookieSession.get('token') as string | undefined
  if (!token) return null
  try {
    const checkForRevocation = true
    const tokenUser = await getAuth().verifySessionCookie(
      token,
      checkForRevocation,
    )
    return tokenUser as SessionUser
  } catch {
    return null
  }
}

export {
  rootStorage,
  requireUser,
  getUser,
  sendToken,
  verifySignInLink,
  getSessionToken,
  signOutSession,
  signInSession,
}
