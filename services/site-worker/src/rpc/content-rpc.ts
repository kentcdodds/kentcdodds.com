import { WorkerEntrypoint } from 'cloudflare:workers'
import {
	getCachedArtifactBundle,
	getDocumentCodeFromBundle,
} from '../artifact-bundle-cache.ts'
import { readMdxManifest } from '../manifest.ts'
import type { ParentWorkerEnv } from './types.ts'

export class ContentRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async getDocumentCode(contentDir: string, slug: string) {
		const manifest = await readMdxManifest(this.env.CONTENT_KV)
		if (!manifest) return null

		const bundle = getCachedArtifactBundle(manifest.version)
		if (!bundle) return null

		return getDocumentCodeFromBundle(bundle, contentDir, slug)
	}
}
