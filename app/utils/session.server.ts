import type {Request, Loader} from '@remix-run/data'
import type * as TFA from '@firebase/auth-types'
import {createCookieSessionStorage, redirect} from '@remix-run/data'
import admin from 'firebase-admin'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import {sendConfirmationEmail} from './send-email'

firebase.initializeApp({
  apiKey: 'AIzaSyBTILXfzRTTFa2RaENww2Vra3W5Cb95i5k',
  authDomain: 'kentcdodds-com.firebaseapp.com',
  projectId: 'kentcdodds-com',
  storageBucket: 'kentcdodds-com.appspot.com',
  messagingSenderId: '474697802893',
  appId: '1:474697802893:web:d8d3733fc5728bc1e3aec4',
})

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

async function createUserSession(idToken: string) {
  const {getSession, commitSession} = rootStorage
  const token = await getSessionToken(idToken)
  const session = await getSession()
  session.set('token', token)
  const cookie = await commitSession(session, {maxAge: 604_800})
  return redirect('/me', {
    headers: {'Set-Cookie': cookie},
  })
}

function isFirebaseAuthError(error: unknown): error is TFA.Error {
  return typeof error === 'object' && error !== null && 'code' in error
}

// https://firebase.google.com/docs/auth/web/password-auth
// https://firebase.google.com/docs/reference/js/firebase.auth.Auth#createUserWithEmailAndPassword
async function createEmailUser(email: string, password: string) {
  const messages: Record<string, string> = {
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/email-already-exists': 'The email address is already in use',
    'auth/invalid-email': "The email address provided doesn't seem valid",
  }

  try {
    const userCred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
    const user = userCred.user
    if (!user || !user.email) {
      throw new Error(
        'Failed to create a new user for you. Please contact team@kentcdodds.com.',
      )
    }
    const confirmationLink = await getAdmin()
      .auth()
      .generateEmailVerificationLink(user.email)
    await sendConfirmationEmail({emailAddress: user.email, confirmationLink})
    const usersRef = getDb().collection('users')
    await usersRef.doc(user.uid).set({team: null})
    return userCred
  } catch (error: unknown) {
    if (isFirebaseAuthError(error)) {
      error.message = messages[error.code] ?? error.message
    }
    throw error
  }
}

async function confirmUser(code: string) {
  await firebase.auth().applyActionCode(code)
}

async function signInWithEmail(email: string, password: string) {
  return await firebase.auth().signInWithEmailAndPassword(email, password)
}

let lazyDb: FirebaseFirestore.Firestore | undefined
function getDb(): FirebaseFirestore.Firestore {
  if (!lazyDb) {
    lazyDb = getAdmin().firestore()
  }
  return lazyDb
}

// we do lazy initialization so folks can work on the website without having
// a FIREBASE_SERVICE_ACCOUNT_KEY configured
let lazyAdmin: typeof admin | undefined
function getAdmin() {
  if (!lazyAdmin) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required to do auth',
      )
    }
    const serviceAccount = JSON.parse(serviceAccountKey)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    lazyAdmin = admin
  }

  return lazyAdmin
}

async function sendCurrentUserConfirmationEmail(request: Request) {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const sessionUser = await getUserSession(request)
  if (!sessionUser) {
    return redirect('/login')
  }
  const firebaseUser = await getAdmin().auth().getUser(sessionUser.uid)

  // pretty sure the firebaseUser could be undefined or null...
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const email = firebaseUser?.email

  if (!email) {
    session.flash('message', 'Could not find an email address for this user.')
    const cookie = await rootStorage.commitSession(session)
    return redirect(`/me`, {headers: {'Set-Cookie': cookie}})
  }

  const confirmationLink = await getAdmin()
    .auth()
    .generateEmailVerificationLink(email)
  await sendConfirmationEmail({emailAddress: email, confirmationLink})

  session.flash(
    'message',
    `Email sent. Please check ${email} and click the confirmation link.`,
  )
  const cookie = await rootStorage.commitSession(session)
  return redirect(`/me`, {headers: {'Set-Cookie': cookie}})
}

async function getSessionToken(idToken: string) {
  const auth = getAdmin().auth()
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
  const user = {uid: userDoc.id, ...userDoc.data()}
  return {sessionUser, user, userDoc}
}

function requireUser(request: Request) {
  return async (
    loader: (data: {
      sessionUser: admin.auth.DecodedIdToken | null
      user: {uid: string}
      userDoc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
    }) => ReturnType<Loader>,
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
  const token = cookieSession.get('token')
  if (!token) return null
  try {
    const checkForRevocation = true
    const tokenUser = await getAdmin()
      .auth()
      .verifySessionCookie(token, checkForRevocation)
    return tokenUser
  } catch {
    return null
  }
}

export {
  rootStorage,
  createUserSession,
  requireUser,
  getUser,
  createEmailUser,
  signInWithEmail,
  confirmUser,
  sendCurrentUserConfirmationEmail,
}
