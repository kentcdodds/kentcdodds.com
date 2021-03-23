import admin from 'firebase-admin'

export {admin}

let db: FirebaseFirestore.Firestore
export function getDb(): FirebaseFirestore.Firestore {
  // huh?
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!db) {
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

    db = admin.firestore()
  }
  return db
}

export async function getSessionToken(idToken: string) {
  const auth = admin.auth()
  const decodedToken = await auth.verifyIdToken(idToken)
  if (new Date().getTime() / 1000 - decodedToken.auth_time > 5 * 60) {
    throw new Error('Recent sign in required')
  }
  const twoWeeks = 60 * 60 * 24 * 14 * 1000
  return auth.createSessionCookie(idToken, {expiresIn: twoWeeks})
}
