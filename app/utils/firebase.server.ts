import admin from 'firebase-admin'
import firebase from 'firebase/app'
import 'firebase/auth'
import type {ServiceAccount} from 'firebase-admin'
import {createNewUser, getUserById} from './prisma.server'

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

async function getMagicLink(emailAddress: string) {
  const magicLink = await getAuth().generateSignInWithEmailLink(emailAddress, {
    handleCodeInApp: true,
    url: 'https://kentcdodds.com/me',
  })
  return magicLink
}

async function getSessionTokenFromMagicLink({
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
  const idToken = await result.user.getIdToken()

  const auth = getAuth()
  const decodedToken = await auth.verifyIdToken(idToken)
  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error('Recent sign in required')
  }
  const twoWeeks = 60 * 60 * 24 * 14 * 1000
  const sessionToken = await auth.createSessionCookie(idToken, {
    expiresIn: twoWeeks,
  })
  return sessionToken
}

async function getUserFromToken(token: string) {
  const checkForRevocation = true
  const sessionUser = await getAuth().verifySessionCookie(
    token,
    checkForRevocation,
  )

  const email = sessionUser.email
  if (!email) return null

  const authId = sessionUser.uid

  const user =
    (await getUserById(authId)) ?? (await createNewUser({authId, email}))
  return user
}

export {getMagicLink, getUserFromToken, getSessionTokenFromMagicLink}
