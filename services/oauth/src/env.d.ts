import { type OAuthHelpers } from '@cloudflare/workers-oauth-provider'

export interface Env {
	INTERNAL_SECRET: string
	OAUTH_KV: KVNamespace
	OAUTH_PROVIDER: OAuthHelpers
	ENVIRONMENT?: 'local'
}
