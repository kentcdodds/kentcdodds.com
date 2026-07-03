import { createHash } from 'node:crypto'
import { type ContentInputFile } from './local-content.ts'

export function computeContentVersion(inputs: Array<ContentInputFile>) {
	const hash = createHash('sha256')
	for (const { path, content } of inputs) {
		hash.update(path)
		hash.update('\0')
		hash.update(content)
		hash.update('\0')
	}
	return hash.digest('hex').slice(0, 16)
}
