// Defer @simplewebauthn/server (~270KB minified) until passkey routes run so the
// production app-worker bundle does not evaluate it on cold Worker Loader starts.
type WebAuthnSdkModule = typeof import('./webauthn-sdk.server.ts')

let webauthnSdkPromise: Promise<WebAuthnSdkModule> | undefined

export async function getWebAuthnSdk(): Promise<WebAuthnSdkModule> {
	webauthnSdkPromise ??= import('./webauthn-sdk.server.ts')
	return webauthnSdkPromise
}
