import admin from 'firebase-admin'

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

export {admin, getSessionToken, getDb}
