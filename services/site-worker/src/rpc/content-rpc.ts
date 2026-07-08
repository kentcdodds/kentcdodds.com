import { WorkerEntrypoint } from 'cloudflare:workers'
import {
	getDocumentCodeFromBundle,
	getOrFetchArtifactBundle,
} from '../artifact-bundle-cache.ts'
import { readMdxManifest } from '../manifest.ts'
import type { ParentWorkerEnv } from './types.ts'

export class ContentRpc extends WorkerEntrypoint<ParentWorkerEnv> {
	async getDocumentCode(contentDir: string, slug: string) {
		const manifest = await readMdxManifest(this.env.CONTENT_KV)
		if (!manifest) return null

		// Falls back to KV/R2 when the parent-memory cache is cold (e.g. right
		// after an artifact publish cleared it) so in-flight MDX requests keep
		// working.
		const bundle = await getOrFetchArtifactBundle(
			this.env,
			manifest.version,
			manifest.r2Key,
		)
		if (!bundle) return null

		return getDocumentCodeFromBundle(bundle, contentDir, slug)
	}
}
