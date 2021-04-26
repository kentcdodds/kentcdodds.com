import type {Request, LoaderFunction, Session} from '@remix-run/node'
import {createCookieSessionStorage, redirect} from '@remix-run/node'
import type {ServiceAccount} from 'firebase-admin'
import admin from 'firebase-admin'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import {sendMagicLinkEmail} from './send-email'

type UserData = {
  uid: string
  firstName: string
  team: string
}

type SessionUser = admin.auth.DecodedIdToken & {email: string}

let secret = 'not-at-all-secret'
if (process.env.SESSION_SECRET) {
  secret = process.env.SESSION_SECRET
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Must set SESSION_SECRET')
}

// if the require cache for this file is deleted (as in development), then this
// code will run again which could result in re-initializing firebase. So we
// just double check that there's not already an initialized firebase app
// before initializing.
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: 'AIzaSyBTILXfzRTTFa2RaENww2Vra3W5Cb95i5k',
    authDomain: 'kentcdodds-com.firebaseapp.com',
    projectId: 'kentcdodds-com',
    storageBucket: 'kentcdodds-com.appspot.com',
    messagingSenderId: '474697802893',
    appId: '1:474697802893:web:d8d3733fc5728bc1e3aec4',
  })
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

  await sendMagicLinkEmail({emailAddress, confirmationLink})
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

let lazyDb: FirebaseFirestore.Firestore | undefined
function getDb(): FirebaseFirestore.Firestore {
  if (!lazyDb) {
    lazyDb = getAdmin().firestore()
  }
  return lazyDb
}

let lazyAuth: admin.auth.Auth | undefined
function getAuth(): admin.auth.Auth {
  if (!lazyAuth) {
    lazyAuth = getAdmin().auth()
  }
  return lazyAuth
}

// we do lazy initialization so folks can work on the website without having
// a FIREBASE_SERVICE_ACCOUNT_KEY configured
let lazyAdmin: typeof admin | undefined
function getAdmin() {
  if (admin.apps.length) {
    lazyAdmin = admin
  }
  if (!lazyAdmin) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required to do auth',
      )
    }
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    lazyAdmin = admin
  }

  return lazyAdmin
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
