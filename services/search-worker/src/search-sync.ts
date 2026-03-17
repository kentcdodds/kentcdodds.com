import {
	LEXICAL_SEARCH_ARTIFACT_KEYS,
	type LexicalSearchArtifact,
} from '@kcd-internal/search-shared'
import {
	clearSearchSource,
	ensureSearchSchema,
	getSearchSourceState,
	markSearchSynced,
	replaceSearchSource,
} from './search-db'
import { type Env } from './env'

async function getLexicalSearchArtifact({
	env,
	key,
}: {
	env: Env
	key: string
}): Promise<LexicalSearchArtifact | null> {
	const object = await env.SEARCH_ARTIFACTS_BUCKET.get(key)
	if (!object) return null
	try {
		return await object.json<LexicalSearchArtifact>()
	} catch (error) {
		console.error(
			`Malformed JSON in search artifact ${key}:`,
			error instanceof Error ? error.message : error,
		)
		return null
	}
}

export async function syncSearchArtifacts({
	env,
	force = false,
}: {
	env: Env
	force?: boolean
}) {
	await ensureSearchSchema(env.SEARCH_DB)
	const syncedAt = new Date().toISOString()

	for (const sourceKey of LEXICAL_SEARCH_ARTIFACT_KEYS) {
		const artifact = await getLexicalSearchArtifact({ env, key: sourceKey })
		if (!artifact) {
			await clearSearchSource({
				db: env.SEARCH_DB,
				sourceKey,
			})
			continue
		}

		const sourceState = await getSearchSourceState({
			db: env.SEARCH_DB,
			sourceKey,
		})
		if (
			!force &&
			sourceState?.generatedAt === artifact.generatedAt &&
			sourceState?.chunkCount === artifact.chunks.length
		) {
			continue
		}

		await replaceSearchSource({
			db: env.SEARCH_DB,
			sourceKey,
			artifact,
			syncedAt,
		})
	}

	await markSearchSynced({
		db: env.SEARCH_DB,
		syncedAt,
	})

	return { syncedAt }
}
