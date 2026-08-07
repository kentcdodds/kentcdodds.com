import { WorkerEntrypoint } from 'cloudflare:workers'
import { resolveDocumentCode } from '../artifact-bundle-cache.ts'
import { readMdxManifest } from '../manifest.ts'
import type { ParentWorkerEnv } from './types.ts'

export class ContentRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async getDocumentCode(contentDir: string, slug: string) {
		const manifest = await readMdxManifest(this.env.CONTENT_KV)
		if (!manifest) return null

		// Legacy full bundles serve code straight from parent memory; stripped
		// mirrors read the per-doc `mdx-code:` KV key, with the full R2 bundle
		// as the final fallback for deploy/publish races.
		return resolveDocumentCode(this.env, manifest, contentDir, slug)
	}
}
