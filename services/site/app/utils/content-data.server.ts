import fs from 'node:fs/promises'
import path from 'node:path'
import {
	getArtifactDataFile,
	getContentData,
} from './content-artifacts.server.ts'

export async function getContentDataFile(key: string): Promise<string> {
	const artifact = getArtifactDataFile(key)
	if (artifact) return artifact

	const localPath = path.join(process.cwd(), 'content', key)
	return fs.readFile(localPath, 'utf8')
}

/**
 * Cache key for YAML content data files.
 *
 * Include the artifact content version so republished MDX bundles do not keep
 * serving stale parsed YAML from the long-lived application cache.
 */
export function getContentDataCacheKey(dataFilename: string): string {
	const baseKey = `content:data:${dataFilename}`
	const version = getContentData()?.version
	return version ? `${baseKey}:${version}` : baseKey
}
