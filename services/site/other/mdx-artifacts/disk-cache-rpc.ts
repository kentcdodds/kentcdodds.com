import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { totalTtl, type CacheEntry } from '@epic-web/cachified'
import {
	decodeCacheEntry,
	encodeCacheEntry,
} from '#app/utils/cache-encoding.server.ts'

/**
 * Disk-backed cachified store with the same interface as the production
 * CACHE_RPC binding. The Node-only compile processes register it as their
 * runtime binding source so every cachified call in the compile pipeline
 * (tweet embed HTML, oEmbed responses, mermaid SVGs) persists across runs —
 * in CI the directory is restored from the Actions cache between deploys.
 */
export type DiskCacheRpc = {
	get(key: string): Promise<CacheEntry<unknown> | null>
	set(key: string, entry: CacheEntry<unknown>): Promise<void>
	delete(key: string): Promise<void>
	keys(prefix?: string, limit?: number): Promise<Array<string>>
}

type StoredDiskCacheEntry = {
	key: string
	value: string
	metadata: string
}

function entryFilePath(dir: string, key: string) {
	const hash = createHash('sha256').update(key).digest('hex').slice(0, 32)
	return path.join(dir, `${hash}.json`)
}

function isEntryExpired(entry: CacheEntry<unknown>) {
	const ttl = totalTtl(entry.metadata)
	if (!Number.isFinite(ttl)) return false
	return entry.metadata.createdTime + ttl < Date.now()
}

async function readStoredEntry(filePath: string) {
	try {
		const stored = JSON.parse(
			await fs.readFile(filePath, 'utf8'),
		) as StoredDiskCacheEntry | null
		if (
			!stored ||
			typeof stored.key !== 'string' ||
			typeof stored.value !== 'string' ||
			typeof stored.metadata !== 'string'
		) {
			return null
		}
		return stored
	} catch {
		return null
	}
}

export function createDiskCacheRpc(dir: string): DiskCacheRpc {
	return {
		async get(key) {
			const filePath = entryFilePath(dir, key)
			const stored = await readStoredEntry(filePath)
			if (!stored || stored.key !== key) return null
			let entry: CacheEntry<unknown> | null
			try {
				entry = decodeCacheEntry(stored)
			} catch {
				entry = null
			}
			if (!entry || isEntryExpired(entry)) {
				await fs.rm(filePath, { force: true })
				return null
			}
			return entry
		},
		async set(key, entry) {
			await fs.mkdir(dir, { recursive: true })
			const filePath = entryFilePath(dir, key)
			const stored: StoredDiskCacheEntry = { key, ...encodeCacheEntry(entry) }
			// Write-then-rename so an interrupted write (e.g. a background
			// stale-while-revalidate refresh cut off at process exit) never leaves
			// a truncated JSON file behind.
			const tempPath = `${filePath}.${process.pid}.tmp`
			await fs.writeFile(tempPath, JSON.stringify(stored), 'utf8')
			await fs.rename(tempPath, filePath)
		},
		async delete(key) {
			await fs.rm(entryFilePath(dir, key), { force: true })
		},
		async keys(prefix, limit = 100) {
			let fileNames: Array<string>
			try {
				fileNames = await fs.readdir(dir)
			} catch {
				return []
			}
			const keys: Array<string> = []
			for (const fileName of fileNames) {
				if (!fileName.endsWith('.json')) continue
				const stored = await readStoredEntry(path.join(dir, fileName))
				if (!stored) continue
				if (prefix && !stored.key.startsWith(prefix)) continue
				keys.push(stored.key)
				if (keys.length >= limit) break
			}
			return keys.sort()
		},
	}
}
