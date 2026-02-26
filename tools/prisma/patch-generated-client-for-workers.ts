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

	if (source.includes(safeDirnameAssignment)) {
		console.info('Prisma generated client already contains safe __dirname patch.')
		return
	}

	if (!source.includes(unsafeDirnameAssignment)) {
		console.warn(
			`Skipping Prisma generated client patch; expected line was not found in ${generatedClientPath}`,
		)
		return
	}

	const patchedSource = source.replace(
		unsafeDirnameAssignment,
		safeDirnameAssignment,
	)

	await writeFile(generatedClientPath, patchedSource, 'utf8')
	console.info('Patched Prisma generated client for Worker deploy compatibility.')
}

patchGeneratedPrismaClientForWorkers().catch((error) => {
	console.error('Failed to patch Prisma generated client for Workers', error)
	process.exitCode = 1
})
