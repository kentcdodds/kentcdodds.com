import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The dist/*.txt modules are build outputs of `npm run build:app-worker` and
// are not tracked in git. Tests and typechecking only need the files to
// exist, so create tiny placeholders when the real build hasn't run yet.
const distDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../dist',
)

const placeholders = {
	'app-worker.js.txt':
		'export default { fetch() { throw new Error("app-worker placeholder: run `npm run build:app-worker`") } }\n',
	'react-shim.js.txt': '// placeholder: run `npm run build:app-worker`\n',
	'react-jsx-runtime-shim.js.txt':
		'// placeholder: run `npm run build:app-worker`\n',
}

export function ensureDistPlaceholders() {
	fs.mkdirSync(distDir, { recursive: true })
	for (const [name, contents] of Object.entries(placeholders)) {
		const filePath = path.join(distDir, name)
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, contents)
		}
	}
}

ensureDistPlaceholders()
