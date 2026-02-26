import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDirectory, '../..')
const runtimeClientPath = path.join(
	workspaceRoot,
	'node_modules/@prisma/client/runtime/client.mjs',
)

const unsafeFilenameAssignment =
	'const __filename = __banner_node_url.fileURLToPath(import.meta.url);'
const safeFilenameAssignment =
	'const __filename = typeof import.meta.url === "string" ? __banner_node_url.fileURLToPath(import.meta.url) : "/";'

async function patchPrismaRuntimeClientForWorkers() {
	const source = await readFile(runtimeClientPath, 'utf8')

	if (source.includes(safeFilenameAssignment)) {
		console.info('Prisma runtime client already contains safe __filename patch.')
		return
	}

	if (!source.includes(unsafeFilenameAssignment)) {
		console.warn(
			`Skipping Prisma runtime patch; expected line was not found in ${runtimeClientPath}`,
		)
		return
	}

	const patchedSource = source.replace(
		unsafeFilenameAssignment,
		safeFilenameAssignment,
	)

	await writeFile(runtimeClientPath, patchedSource, 'utf8')
	console.info('Patched Prisma runtime client for Worker deploy compatibility.')
}

patchPrismaRuntimeClientForWorkers().catch((error) => {
	console.error('Failed to patch Prisma runtime client for Workers', error)
	process.exitCode = 1
})
