import admin from 'firebase-admin'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import type {ServiceAccount} from 'firebase-admin'

type SessionUser = admin.auth.DecodedIdToken & {email: string}

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

export {getDb, getAuth, firebase}
export type {SessionUser}
