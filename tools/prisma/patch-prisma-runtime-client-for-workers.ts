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
const unsafeCreateRequireAssignment =
	'const require = __banner_node_module.createRequire(import.meta.url);'
const safeCreateRequireAssignment =
	'const require = __banner_node_module.createRequire(__filename);'

async function patchPrismaRuntimeClientForWorkers() {
	const source = await readFile(runtimeClientPath, 'utf8')

	if (
		!source.includes(unsafeFilenameAssignment) &&
		!source.includes(safeFilenameAssignment)
	) {
		console.warn(
			`Skipping Prisma runtime patch; expected __filename line was not found in ${runtimeClientPath}`,
		)
		return
	}

	let patchedSource = source
	if (patchedSource.includes(unsafeFilenameAssignment)) {
		patchedSource = patchedSource.replace(
			unsafeFilenameAssignment,
			safeFilenameAssignment,
		)
	}
	if (patchedSource.includes(unsafeCreateRequireAssignment)) {
		patchedSource = patchedSource.replace(
			unsafeCreateRequireAssignment,
			safeCreateRequireAssignment,
		)
	}

	await writeFile(runtimeClientPath, patchedSource, 'utf8')
	console.info(
		'Patched Prisma runtime client __filename/createRequire for Worker deploy compatibility.',
	)
}

patchPrismaRuntimeClientForWorkers().catch((error) => {
	console.error('Failed to patch Prisma runtime client for Workers', error)
	process.exitCode = 1
})
