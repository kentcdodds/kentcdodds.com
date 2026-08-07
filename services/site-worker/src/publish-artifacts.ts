import { clearArtifactBundleCache } from './artifact-bundle-cache.ts'
import { writeArtifactBundleKvMirror } from './artifact-kv-mirror.ts'
import { clearManifestCache } from './manifest.ts'
import type { MdxArtifactBundle } from './module-map.ts'
import { bumpPageCacheGeneration } from './page-cache.ts'
import { isParentSecretAuthorized } from './parent-rate-limit.ts'
import type { ParentWorkerEnv } from './rpc/types.ts'

export const ARTIFACT_PUBLISH_PATH = '/resources/mdx-artifacts'

export async function handlePublishArtifacts(
	request: Request,
	env: ParentWorkerEnv,
) {
	// Publishing MDX artifacts is effectively a code deploy (the bundles run
	// in Worker Loader isolates with full bindings), so the auth check is
	// constant-time to avoid leaking the secret via timing.
	if (
		!isParentSecretAuthorized(
			request.headers.get('auth'),
			env.REFRESH_CACHE_SECRET,
		)
	) {
		return new Response(null, { status: 404 })
	}

	const bodyText = await request.text()
	let bundle: MdxArtifactBundle
	try {
		bundle = JSON.parse(bodyText) as MdxArtifactBundle
	} catch {
		return Response.json(
			{ ok: false, error: 'Invalid JSON body' },
			{ status: 400 },
		)
	}

	if (!bundle.version || typeof bundle.version !== 'string') {
		return Response.json(
			{ ok: false, error: 'Bundle JSON must include a string "version" field' },
			{ status: 400 },
		)
	}

	// The runtime loader only understands schemaVersion 1; accepting anything
	// else would poison the manifest with a bundle isolates cannot load.
	if (bundle.schemaVersion !== 1) {
		return Response.json(
			{ ok: false, error: 'Unsupported bundle schemaVersion (expected 1)' },
			{ status: 400 },
		)
	}

	const r2Key = `mdx-artifacts/${bundle.version}.json`
	await env.MDX_ARTIFACTS.put(r2Key, bodyText, {
		httpMetadata: { contentType: 'application/json' },
	})

	// Overwrite the KV mirror too: fetchArtifactBundle prefers the mirror, so
	// a republish with an unchanged version/r2Key must not keep serving the
	// previously mirrored artifact JSON. The mirror is code-stripped and the
	// per-document code keys land before the manifest flip below, so a
	// manifest pointing at this version never races ahead of its code keys.
	// Rollout note: an old worker version could not read a stripped mirror,
	// but deploy-site.yml replaces all isolates before/with the publish and
	// content-only publishes go through the already-deployed worker.
	try {
		await writeArtifactBundleKvMirror(env.CONTENT_KV, r2Key, bundle)
	} catch {
		// KV values cap at 25 MiB; R2 remains the source of truth, and
		// getDocumentCode falls back to R2 for missing code keys.
	}

	const manifest = JSON.stringify({ version: bundle.version, r2Key })
	await env.CONTENT_KV.put('mdx-manifest:current', manifest)
	clearManifestCache()
	clearArtifactBundleCache()
	const pageCacheGeneration = await bumpPageCacheGeneration(env.CONTENT_KV)

	return Response.json({
		ok: true,
		version: bundle.version,
		r2Key,
		pageCacheGeneration,
	})
}
