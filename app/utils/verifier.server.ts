// verifier is an email verification service

import {getRequiredServerEnvVar} from './misc'

const VERIFIER_API_KEY = getRequiredServerEnvVar('VERIFIER_API_KEY')

export async function verifyEmailAddress(emailAddress: string) {
  const verifierUrl = new URL(
    `https://verifier.meetchopra.com/verify/${emailAddress}`,
  )
  verifierUrl.searchParams.append('token', VERIFIER_API_KEY)
  type VerifierResult =
    | {status: true; email: string; domain: string}
    | {
        status: false
        error: {code: number; message: string}
      }
  const response = await fetch(verifierUrl.toString())
  const verifierResult: VerifierResult = await response.json()
  return verifierResult
}
