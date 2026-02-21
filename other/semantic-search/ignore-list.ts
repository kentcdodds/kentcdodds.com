import { getJsonObject } from './r2-manifest.ts'
import {
	DEFAULT_IGNORE_LIST_KEY,
	getIgnoreListKey,
	isDocIdIgnored,
	matchesIgnorePattern,
	type SemanticSearchIgnoreList,
} from './ignore-list-patterns.ts'

export {
	DEFAULT_IGNORE_LIST_KEY,
	getIgnoreListKey,
	isDocIdIgnored,
	matchesIgnorePattern,
}
export type { SemanticSearchIgnoreList }

export async function getSemanticSearchIgnoreList({
	bucket,
	key = getIgnoreListKey(),
}: {
	bucket: string
	key?: string
}): Promise<SemanticSearchIgnoreList> {
	return (
		(await getJsonObject<SemanticSearchIgnoreList>({ bucket, key })) ?? {
			version: 1,
			patterns: [],
		}
	)
}
