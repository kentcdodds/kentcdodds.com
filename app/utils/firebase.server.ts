import admin from 'firebase-admin'
import serviceAccount from '../../config/firebase-service-account-key.json'

export {admin}

admin.initializeApp({
  // @ts-expect-error can't infer from json?
  credential: admin.credential.cert(serviceAccount),
})

export const db = admin.firestore()

export async function getSessionToken(idToken: string) {
  const auth = admin.auth()
  const decodedToken = await auth.verifyIdToken(idToken)
  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error('Recent sign in required')
  }
  const thirtyDays = 60 * 60 * 24 * 30 * 1000
  return auth.createSessionCookie(idToken, {expiresIn: thirtyDays})
}
