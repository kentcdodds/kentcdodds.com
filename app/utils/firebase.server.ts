import admin from 'firebase-admin'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import type * as TFA from '@firebase/auth-types'

firebase.initializeApp({
  apiKey: 'AIzaSyBTILXfzRTTFa2RaENww2Vra3W5Cb95i5k',
  authDomain: 'kentcdodds-com.firebaseapp.com',
  projectId: 'kentcdodds-com',
  storageBucket: 'kentcdodds-com.appspot.com',
  messagingSenderId: '474697802893',
  appId: '1:474697802893:web:d8d3733fc5728bc1e3aec4',
})

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
    return firebase.auth().createUserWithEmailAndPassword(email, password)
  } catch (error: unknown) {
    if (isFirebaseAuthError(error)) {
      error.message = messages[error.code] ?? error.message
    }
    throw error
  }
}

async function signInWithEmail(email: string, password: string) {
  return firebase.auth().signInWithEmailAndPassword(email, password)
}

let lazyDb: FirebaseFirestore.Firestore | undefined
function getDb(): FirebaseFirestore.Firestore {
  if (!lazyDb) {
    initialize()
    lazyDb = admin.firestore()
  }
  return lazyDb
}

// we do lazy initialization so folks can work on the website without having
// a FIREBASE_SERVICE_ACCOUNT_KEY configured
let isInitialized = false
function initialize() {
  if (isInitialized) return
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

  isInitialized = true
}

async function getSessionToken(idToken: string) {
  initialize()
  const auth = admin.auth()
  const decodedToken = await auth.verifyIdToken(idToken)
  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error('Recent sign in required')
  }
  const twoWeeks = 60 * 60 * 24 * 14 * 1000
  return auth.createSessionCookie(idToken, {expiresIn: twoWeeks})
}

export {admin, getSessionToken, getDb, createEmailUser, signInWithEmail}
