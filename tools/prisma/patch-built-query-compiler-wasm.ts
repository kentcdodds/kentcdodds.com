import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDirectory, '../..')
const buildServerIndexPath = path.join(workspaceRoot, 'build/server/index.js')
const generatedWasmSourcePath = path.join(
	workspaceRoot,
	'app/utils/prisma-generated.server/internal/query_compiler_fast_bg.wasm',
)
const wasmModuleImportPattern =
	/["'](\.\/[^"']*app\/utils\/prisma-generated\.server\/internal\/query_compiler_fast_bg\.wasm\?module)["']/g

async function patchBuiltQueryCompilerWasm() {
	const buildServerSource = await readFile(buildServerIndexPath, 'utf8')
	const importMatches = Array.from(
		buildServerSource.matchAll(wasmModuleImportPattern),
	)

	if (importMatches.length === 0) {
		console.info('No query compiler wasm module imports found to prepare.')
		return
	}

	let copiedModuleTargets = 0
	for (const match of importMatches) {
		const moduleImportPath = match[1]
		if (!moduleImportPath) continue
		const relativeOutputPath = moduleImportPath.replace(/^\.\//, '')
		const outputPath = path.join(workspaceRoot, 'build/server', relativeOutputPath)
		const outputDirectory = path.dirname(outputPath)

		await mkdir(outputDirectory, { recursive: true })
		await copyFile(generatedWasmSourcePath, outputPath)
		copiedModuleTargets++
	}

	console.info(
		`Prepared ${copiedModuleTargets} query compiler wasm module import path(s) for Wrangler bundling.`,
	)
}

patchBuiltQueryCompilerWasm().catch((error) => {
	console.error('Failed to patch built query compiler assets', error)
	process.exitCode = 1
})
