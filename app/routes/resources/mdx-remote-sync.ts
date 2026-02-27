import { data as json, redirect } from 'react-router'
import { cache } from '#app/utils/cache.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { getRuntimeBinding } from '#app/utils/runtime-bindings.server.ts'
import { type Route } from './+types/mdx-remote-sync'

type MdxRemoteKvBinding = {
	put(key: string, value: string): Promise<void>
	delete(key: string): Promise<void>
}

type MdxRemoteSyncBody = {
	upserts?: Array<{ key: string; value: string }>
	deletes?: Array<string>
}

export async function action({ request }: Route.ActionArgs) {
	const authHeader = request.headers.get('authorization')
	const expectedAuth = `Bearer ${getEnv().INTERNAL_COMMAND_TOKEN}`
	if (authHeader !== expectedAuth) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
	}

	const binding = getRuntimeBinding<MdxRemoteKvBinding>('MDX_REMOTE_KV')
	if (!binding) {
		return json(
			{ ok: false, error: 'Missing runtime binding: MDX_REMOTE_KV' },
			{ status: 500 },
		)
	}

	const body = (await request.json()) as MdxRemoteSyncBody
	const upserts = Array.isArray(body.upserts) ? body.upserts : []
	const deletes = Array.isArray(body.deletes) ? body.deletes : []
	const touchedArtifactKeys = new Set<string>()

	for (const upsert of upserts) {
		if (!upsert || typeof upsert !== 'object') continue
		const key = typeof upsert.key === 'string' ? upsert.key : ''
		const value = typeof upsert.value === 'string' ? upsert.value : ''
		if (!key || !value) continue
		await binding.put(key, value)
		touchedArtifactKeys.add(key)
	}

	for (const key of deletes) {
		if (typeof key !== 'string' || key.length === 0) continue
		await binding.delete(key)
		touchedArtifactKeys.add(key)
	}

	await invalidateMdxCaches(Array.from(touchedArtifactKeys))

	return json(
		{
			ok: true,
			upserted: upserts.length,
			deleted: deletes.length,
			touchedArtifactKeys: touchedArtifactKeys.size,
		},
		{ status: 200 },
	)
}

async function invalidateMdxCaches(artifactKeys: Array<string>) {
	const keysToDelete = new Set<string>()
	for (const artifactKey of artifactKeys) {
		if (artifactKey === 'manifest.json') {
			keysToDelete.add('blog:dir-list:remote')
			keysToDelete.add('pages:dir-list:remote')
			keysToDelete.add('writing-blog:dir-list:remote')
			keysToDelete.add('blog:mdx-list-items')
			continue
		}

		const match = artifactKey.match(/^(blog|pages|writing-blog)\/(.+)\.json$/)
		if (!match) continue
		const collection = match[1]
		const slug = match[2]
		if (!collection || !slug) continue
		keysToDelete.add(`${collection}:${slug}:compiled:remote`)
		keysToDelete.add(`mdx-page:${collection}:${slug}:compiled`)
		keysToDelete.add(`${collection}:dir-list:remote`)
		if (collection === 'blog') {
			keysToDelete.add('blog:mdx-list-items')
		}
	}

	await Promise.all(Array.from(keysToDelete).map((key) => cache.delete(key)))
}

export const loader = () => redirect('/', { status: 404 })
