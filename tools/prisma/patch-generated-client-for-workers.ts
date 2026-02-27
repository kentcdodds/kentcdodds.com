import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDirectory, '../..')
const generatedClientPath = path.join(
	workspaceRoot,
	'app/utils/prisma-generated.server/client.ts',
)

const unsafeDirnameAssignment =
	"globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))"
const safeDirnameAssignment =
	"globalThis['__dirname'] = typeof import.meta.url === 'string' ? path.dirname(fileURLToPath(import.meta.url)) : '/'"

async function patchGeneratedPrismaClientForWorkers() {
	const source = await readFile(generatedClientPath, 'utf8')

	const clientAlreadyPatched = source.includes(safeDirnameAssignment)

	if (clientAlreadyPatched) {
		console.info('Prisma generated client already contains worker-safe patch.')
		return
	}

	let patchedClientSource = source
	if (!clientAlreadyPatched && source.includes(unsafeDirnameAssignment)) {
		patchedClientSource = source.replace(
			unsafeDirnameAssignment,
			safeDirnameAssignment,
		)
	} else if (!clientAlreadyPatched) {
		console.warn(
			`Skipping __dirname patch; expected line was not found in ${generatedClientPath}`,
		)
	}

	if (patchedClientSource !== source) {
		await writeFile(generatedClientPath, patchedClientSource, 'utf8')
	}
	console.info('Patched Prisma generated client for Worker deploy compatibility.')
}

patchGeneratedPrismaClientForWorkers().catch((error) => {
	console.error('Failed to patch Prisma generated client for Workers', error)
	process.exitCode = 1
})
