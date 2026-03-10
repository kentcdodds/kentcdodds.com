import type { Sandbox as SandboxBinding } from '@cloudflare/sandbox'

export type Env = {
	Sandbox: DurableObjectNamespace<SandboxBinding>
	R2_ENDPOINT: string
	R2_ACCESS_KEY_ID: string
	R2_SECRET_ACCESS_KEY: string
	CALL_KENT_R2_BUCKET: string
	CALL_KENT_AUDIO_CALLBACK_URL: string
	CALL_KENT_AUDIO_CALLBACK_SECRET: string
}
