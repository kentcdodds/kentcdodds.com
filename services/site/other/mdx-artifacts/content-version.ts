import { createHash } from 'node:crypto'
import { type ContentInputFile } from './local-content.ts'

/**
 * Bump whenever the compile pipeline's OUTPUT changes for identical inputs
 * (remark/rehype plugins, URL rewriting, component mapping, esbuild config).
 * The content version keys artifact caches all the way down (KV bundle, the
 * in-memory bundle cache, and the dynamic worker isolate id) — without this,
 * a compiler change with unchanged content would silently keep serving
 * stale artifacts.
 *
 * v3: Cloudinary body URLs rewritten to /media (Cloudflare-hosted assets),
 * including JSX expression attributes and link/poster/source attributes.
 * v4: body /media URLs are host-relative (work on the workers.dev preview
 * pre-flip and on kentcdodds.com post-flip).
 * v5: layered Cloudinary composite URLs (l_, fl_layer_apply, etc.) are left
 * untouched instead of being rewritten to broken /media IDs.
 */
export const ARTIFACT_COMPILER_VERSION = 6

export function computeContentVersion(inputs: Array<ContentInputFile>) {
	const hash = createHash('sha256')
	hash.update(`compiler:${ARTIFACT_COMPILER_VERSION}`)
	hash.update('\0')
	for (const { path, content } of inputs) {
		hash.update(path)
		hash.update('\0')
		hash.update(content)
		hash.update('\0')
	}
	return hash.digest('hex').slice(0, 16)
}
