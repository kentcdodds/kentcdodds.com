import fs from 'node:fs/promises'
import path from 'node:path'
import { getArtifactDataFile } from './content-artifacts.server.ts'

export async function getContentDataFile(key: string): Promise<string> {
	const artifact = getArtifactDataFile(key)
	if (artifact) return artifact

	const localPath = path.join(process.cwd(), 'content', key)
	return fs.readFile(localPath, 'utf8')
}
