import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { createDiskCacheRpc } from '../disk-cache-rpc.ts'

function createTempStore() {
	const dir = path.join(os.tmpdir(), `mdx-disk-cache-${crypto.randomUUID()}`)
	return {
		rpc: createDiskCacheRpc(dir),
		dir,
		async [Symbol.asyncDispose]() {
			await fs.rm(dir, { recursive: true, force: true })
		},
	}
}

test('disk cache round-trips a cachified entry', async () => {
	await using store = createTempStore()
	const entry = {
		value: { html: '<blockquote>tweet</blockquote>' },
		metadata: { createdTime: Date.now(), ttl: 60_000, swr: 120_000 },
	}
	await store.rpc.set('tweet:embed:https://x.com/kentcdodds/status/1', entry)
	const cached = await store.rpc.get(
		'tweet:embed:https://x.com/kentcdodds/status/1',
	)
	expect(cached).toEqual(entry)
})

test('disk cache returns null for a missing key', async () => {
	await using store = createTempStore()
	expect(await store.rpc.get('tweet:embed:missing')).toBeNull()
})

test('disk cache drops entries past their total ttl', async () => {
	await using store = createTempStore()
	await store.rpc.set('tweet:embed:expired', {
		value: 'stale',
		metadata: { createdTime: Date.now() - 10_000, ttl: 1_000, swr: 1_000 },
	})
	expect(await store.rpc.get('tweet:embed:expired')).toBeNull()
})

test('disk cache keeps entries that are stale but within swr', async () => {
	await using store = createTempStore()
	const entry = {
		value: 'stale-but-usable',
		metadata: { createdTime: Date.now() - 10_000, ttl: 1_000, swr: 60_000 },
	}
	await store.rpc.set('tweet:embed:swr', entry)
	expect(await store.rpc.get('tweet:embed:swr')).toEqual(entry)
})

test('disk cache delete removes the entry', async () => {
	await using store = createTempStore()
	await store.rpc.set('mermaid:svg:default:abc', {
		value: '<svg></svg>',
		metadata: { createdTime: Date.now(), ttl: 60_000, swr: 0 },
	})
	await store.rpc.delete('mermaid:svg:default:abc')
	expect(await store.rpc.get('mermaid:svg:default:abc')).toBeNull()
})

test('disk cache keys filters by prefix', async () => {
	await using store = createTempStore()
	const metadata = { createdTime: Date.now(), ttl: 60_000, swr: 0 }
	await store.rpc.set('tweet:embed:a', { value: 1, metadata })
	await store.rpc.set('tweet:embed:b', { value: 2, metadata })
	await store.rpc.set('mermaid:svg:default:c', { value: 3, metadata })
	expect(await store.rpc.keys('tweet:embed:')).toEqual([
		'tweet:embed:a',
		'tweet:embed:b',
	])
})

test('disk cache handles concurrent sets for the same key', async () => {
	await using store = createTempStore()
	const metadata = { createdTime: Date.now(), ttl: 60_000, swr: 0 }
	await Promise.all(
		Array.from({ length: 10 }, (_, index) =>
			store.rpc.set('tweet:embed:contended', { value: index, metadata }),
		),
	)
	const cached = await store.rpc.get('tweet:embed:contended')
	expect(cached).not.toBeNull()
	expect(typeof cached?.value).toBe('number')
})

test('disk cache survives a corrupt entry file', async () => {
	await using store = createTempStore()
	await fs.mkdir(store.dir, { recursive: true })
	await fs.writeFile(path.join(store.dir, 'corrupt.json'), '{not json', 'utf8')
	expect(await store.rpc.get('anything')).toBeNull()
	expect(await store.rpc.keys()).toEqual([])
})
