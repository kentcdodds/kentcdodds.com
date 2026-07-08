/**
 * One-shot migration: copy Cloudinary-hosted media into the `kentcdodds-com`
 * R2 bucket, keyed by the exact Cloudinary public ID.
 *
 * The media endpoint (`/media/...` on the site worker) resolves assets from
 * this bucket. Kent copied most of the library by hand before this script
 * existed (mostly under prefix-stripped keys); this script fills the gaps and
 * is idempotent, so it can be re-run safely.
 *
 * Usage:
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... \
 *     node scripts/migrate-cloudinary-to-r2.mjs [--dry-run] [--verify] [--normalize-oversized] [--archive-originals]
 *
 * `--normalize-oversized` re-encodes image masters larger than ~19.5 MB down
 * to a 4096px-limited version (the Workers Images binding rejects inputs over
 * ~20 MiB with "Network connection lost"). Videos are left untouched.
 *
 * The required-asset list is derived from the repo itself: the image registry
 * (`app/images.tsx`), `bannerCloudinaryId` frontmatter, `cloudinaryId` fields
 * in the data YAML files, `res.cloudinary.com` URLs in content bodies, and a
 * short list of IDs hardcoded in app code.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../..',
)
const SITE = path.join(ROOT, 'site')
const BUCKET = 'kentcdodds-com'
const CLOUD_NAME = 'kentcdodds-com'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CLOUDFLARE_API_TOKEN
if (!accountId || !apiToken) {
	console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required')
	process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const verify = process.argv.includes('--verify')
const normalizeOversized = process.argv.includes('--normalize-oversized')
const archiveOriginals = process.argv.includes('--archive-originals')

const ORIGINALS_PREFIX = 'originals/'

// The Workers Images binding fails on inputs over ~20 MiB.
const OVERSIZED_BYTES = 19_500_000
const NORMALIZED_MAX_DIMENSION = 4096

// IDs referenced directly in app code (outside the images.tsx registry).
const HARDCODED_IDS = [
	'unsplash/photo-1571079570759-8b8800f7c412',
	'unsplash/photo-1590602847861-f357a9332bbc',
	'unsplash/photo-1563225409-127c18758bd5',
	'kent/video-stills/snowboard-butter',
	'kentcdodds.com/illustrations/kody-flying_blue',
	'kentcdodds.com/illustrations/kody/kody_snowboarding_flying_blue',
	'kentcdodds.com/illustrations/kody_profile_white',
	'kentcdodds.com/social-background.png',
	'kentcdodds.com/misc/where_am_i',
	'kentcdodds.com/misc/grimmace',
	'kentcdodds.com/misc/facepalm',
	'kentcdodds.com/misc/approve',
	'kent/profile',
]

// Known video assets (delivered from Cloudinary's /video/upload/ path).
const VIDEO_ID_PATTERN = /(\.mp4$|\/misc\/(where_am_i|grimmace|facepalm|approve)$|team-chooser)/

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry)
		if (statSync(full).isDirectory()) walk(full, files)
		else files.push(full)
	}
	return files
}

function collectRequiredIds() {
	const ids = new Set(HARDCODED_IDS)

	const registrySource = readFileSync(
		path.join(SITE, 'app/images.tsx'),
		'utf8',
	)
	for (const match of registrySource.matchAll(/id: '([^']+)'/g)) {
		ids.add(match[1])
	}

	const contentFiles = walk(path.join(SITE, 'content'))
	for (const file of contentFiles) {
		if (!/\.(mdx?|ya?ml)$/.test(file)) continue
		const source = readFileSync(file, 'utf8')
		for (const match of source.matchAll(
			/^bannerCloudinaryId:\s*['"]?([^'"\n]+?)['"]?\s*$/gm,
		)) {
			const value = match[1].trim()
			if (value && !value.includes(' ')) ids.add(value)
		}
		for (const match of source.matchAll(
			/cloudinaryId[:=]\s*['"]([^'"\n]+?)['"]/gm,
		)) {
			const value = match[1].trim()
			if (value && !value.includes(' ')) ids.add(value)
		}
		for (const match of source.matchAll(
			/res\.cloudinary\.com\/kentcdodds-com\/(?:image|video)\/upload\/([^)"'\s\]<>]+)/g,
		)) {
			let rest = match[1].replace(/&#x[0-9A-Fa-f]+;.*$/, '')
			const parts = rest.split('/')
			while (
				parts.length > 1 &&
				(/^v\d+$/.test(parts[0]) ||
					/^(?:[a-z]{1,3}_[^/]+)(?:,[a-z]{1,3}_[^/]+)*$/.test(parts[0]))
			) {
				parts.shift()
			}
			const id = parts.join('/')
			if (id) ids.add(decodeURIComponent(id))
		}
	}

	return [...ids].sort()
}

async function cfApi(pathname, init = {}) {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4${pathname}`,
		{
			...init,
			headers: {
				authorization: `Bearer ${apiToken}`,
				...init.headers,
			},
		},
	)
	return response
}

async function listAllR2Keys() {
	const keys = new Map()
	let cursor
	for (;;) {
		const params = new URLSearchParams({ per_page: '1000' })
		if (cursor) params.set('cursor', cursor)
		const response = await cfApi(
			`/accounts/${accountId}/r2/buckets/${BUCKET}/objects?${params}`,
		)
		const json = await response.json()
		if (!json.success) {
			throw new Error(`R2 list failed: ${JSON.stringify(json.errors)}`)
		}
		for (const object of json.result ?? []) {
			keys.set(object.key, object.size)
		}
		cursor = json.result_info?.cursor
		if (!cursor || (json.result ?? []).length === 0) break
	}
	return keys
}

function candidateKeys(id) {
	return [
		id,
		id.replace(/^kentcdodds\.com\/content\//, ''),
		id.replace(/^kentcdodds\.com\//, ''),
	]
}

async function fetchCloudinaryOriginal(id) {
	const resourceTypes = VIDEO_ID_PATTERN.test(id)
		? ['video', 'image']
		: ['image', 'video']
	for (const resourceType of resourceTypes) {
		const url = `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${encodeURI(id)}`
		const response = await fetch(url)
		if (response.ok) {
			return {
				bytes: new Uint8Array(await response.arrayBuffer()),
				contentType:
					response.headers.get('content-type') ?? 'application/octet-stream',
				resourceType,
			}
		}
	}
	return null
}

async function putR2Object(key, bytes, contentType) {
	const encodedKey = key.split('/').map(encodeURIComponent).join('/')
	const response = await cfApi(
		`/accounts/${accountId}/r2/buckets/${BUCKET}/objects/${encodedKey}`,
		{
			method: 'PUT',
			headers: { 'content-type': contentType },
			body: bytes,
		},
	)
	const json = await response.json()
	if (!json.success) {
		throw new Error(
			`R2 put failed for ${key}: ${JSON.stringify(json.errors)}`,
		)
	}
}

async function normalizeOversizedImages() {
	const existing = await listAllR2Keys()
	const oversized = [...existing.entries()].filter(
		([key, size]) =>
			size > OVERSIZED_BYTES &&
			!VIDEO_ID_PATTERN.test(key) &&
			!/\.(mp4|webm|mov)$/i.test(key),
	)
	console.log(`${oversized.length} oversized image masters (> ${OVERSIZED_BYTES} bytes)`)

	const failed = []
	for (const [key, size] of oversized) {
		if (dryRun) {
			console.log(`[dry-run] would normalize ${key} (${size} bytes)`)
			continue
		}
		// Cloudinary re-encodes the master at a bounded size; this runs once
		// during migration while the Cloudinary account is still live.
		const cloudinaryIds = [
			key,
			`kentcdodds.com/content/${key}`,
			`kentcdodds.com/${key}`,
		]
		let normalized = null
		for (const id of cloudinaryIds) {
			const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_${NORMALIZED_MAX_DIMENSION},h_${NORMALIZED_MAX_DIMENSION},c_limit,q_90/${encodeURI(id)}`
			const response = await fetch(url)
			if (response.ok) {
				normalized = {
					bytes: new Uint8Array(await response.arrayBuffer()),
					contentType:
						response.headers.get('content-type') ?? 'image/jpeg',
				}
				break
			}
		}
		if (!normalized) {
			failed.push(key)
			console.warn(`could not fetch normalized version for ${key}`)
			continue
		}
		if (normalized.bytes.length > OVERSIZED_BYTES) {
			failed.push(key)
			console.warn(
				`normalized version still too large for ${key}: ${normalized.bytes.length}`,
			)
			continue
		}
		await putR2Object(key, normalized.bytes, normalized.contentType)
		console.log(
			`normalized ${key}: ${size} -> ${normalized.bytes.length} bytes`,
		)
	}
	if (failed.length > 0) {
		console.error(`Failed to normalize: ${failed.join(', ')}`)
		process.exit(1)
	}
}

/**
 * `--normalize-oversized` overwrites R2 masters in place with re-encoded
 * versions, so the pre-normalization originals only exist on Cloudinary.
 * This mode archives any Cloudinary original whose bytes differ from the R2
 * master under `originals/<key>` so nothing is lost when the Cloudinary
 * account is cancelled. Run it (to completion, zero failures) BEFORE
 * cancelling Cloudinary — see docs/agents/cutover-runbook.md.
 */
async function archiveCloudinaryOriginals() {
	const existing = await listAllR2Keys()
	const masters = [...existing.entries()].filter(
		([key]) => !key.startsWith(ORIGINALS_PREFIX),
	)
	console.log(`${masters.length} R2 masters to check against Cloudinary`)

	let archived = 0
	let skippedSame = 0
	let alreadyArchived = 0
	const missingFromCloudinary = []
	for (const [key, size] of masters) {
		if (existing.has(`${ORIGINALS_PREFIX}${key}`)) {
			alreadyArchived++
			continue
		}
		let original = null
		for (const id of candidateCloudinaryIds(key)) {
			original = await fetchCloudinaryOriginal(id)
			if (original) break
		}
		if (!original) {
			// Assets that never lived on Cloudinary (post-migration uploads)
			// have nothing to archive.
			missingFromCloudinary.push(key)
			continue
		}
		if (original.bytes.length === size) {
			skippedSame++
			continue
		}
		if (dryRun) {
			console.log(
				`[dry-run] would archive ${key} (master ${size} bytes, original ${original.bytes.length} bytes)`,
			)
			archived++
			continue
		}
		await putR2Object(
			`${ORIGINALS_PREFIX}${key}`,
			original.bytes,
			original.contentType,
		)
		archived++
		console.log(
			`archived ${key}: original ${original.bytes.length} bytes (master ${size})`,
		)
	}
	console.log(
		`archive summary: ${archived} archived, ${skippedSame} identical to master, ` +
			`${alreadyArchived} already archived, ${missingFromCloudinary.length} not on Cloudinary`,
	)
	if (missingFromCloudinary.length > 0) {
		console.log(
			`not on Cloudinary (nothing to archive): ${missingFromCloudinary.join(', ')}`,
		)
	}
}

function candidateCloudinaryIds(key) {
	return [key, `kentcdodds.com/content/${key}`, `kentcdodds.com/${key}`]
}

async function main() {
	if (normalizeOversized) {
		await normalizeOversizedImages()
		return
	}
	if (archiveOriginals) {
		await archiveCloudinaryOriginals()
		return
	}
	const ids = collectRequiredIds()
	console.log(`Collected ${ids.length} required asset IDs from the repo`)

	const existing = await listAllR2Keys()
	console.log(`Bucket currently holds ${existing.size} objects`)

	const missing = ids.filter(
		(id) => !candidateKeys(id).some((key) => existing.has(key)),
	)
	console.log(`${missing.length} assets missing from R2`)

	if (verify) {
		if (missing.length > 0) {
			console.error('Missing assets:')
			for (const id of missing) console.error(`  ${id}`)
			process.exit(1)
		}
		console.log('All required assets are present in R2')
		return
	}

	let copied = 0
	const failed = []
	for (const id of missing) {
		if (dryRun) {
			console.log(`[dry-run] would copy ${id}`)
			continue
		}
		const asset = await fetchCloudinaryOriginal(id)
		if (!asset) {
			failed.push(id)
			console.warn(`NOT FOUND on Cloudinary: ${id}`)
			continue
		}
		await putR2Object(id, asset.bytes, asset.contentType)
		copied += 1
		console.log(
			`copied ${id} (${asset.resourceType}, ${asset.contentType}, ${asset.bytes.length} bytes)`,
		)
	}

	console.log(`\nDone. Copied ${copied}, failed ${failed.length}.`)
	if (failed.length > 0) {
		console.error('Failed IDs:')
		for (const id of failed) console.error(`  ${id}`)
		process.exit(1)
	}
}

await main()
