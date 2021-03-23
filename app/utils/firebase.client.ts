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
export function createEmailUser(email: string, password: string) {
  const messages: Record<string, string> = {
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/email-already-exists': 'The email address is already in use',
    'auth/invalid-email': "The email address provided doesn't seem valid",
  }

  try {
    return firebase.auth().createUserWithEmailAndPassword(email, password)
  } catch (error: unknown) {
    if (isFirebaseAuthError(error)) {
      const message = messages[error.code] ?? error.message
      throw new Error(message)
    } else {
      throw error
    }
  }
}

export async function signInWithEmail(email: string, password: string) {
  return firebase.auth().signInWithEmailAndPassword(email, password)
}

export async function signInWithGitHub() {
  const provider = new firebase.auth.GithubAuthProvider()
  return firebase.auth().signInWithPopup(provider)
}

export async function getIdToken() {
  const forceRefresh = true
  return firebase.auth().currentUser?.getIdToken(forceRefresh)
}

export async function getClientsideUser() {
  return firebase.auth().currentUser
}

export {firebase}
