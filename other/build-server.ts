import path from 'path'
import { fileURLToPath } from 'url'
import esbuild from 'esbuild'
import fsExtra from 'fs-extra'
import { globSync } from 'glob'

const pkg = fsExtra.readJsonSync(path.join(process.cwd(), 'package.json'))
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const globsafe = (s: string) => s.replace(/\\/g, '/')
const here = (...s: Array<string>) => globsafe(path.join(__dirname, ...s))

const allFiles = globSync(here('../server/**/*.*'), {
	ignore: [
		'server/dev-server.js', // for development only
		'server/content-watcher.ts', // for development only
		'**/tsconfig.json',
		'**/eslint*',
		'**/__tests__/**',
	],
})

const entries = []
const outdir = here('../server-build')
for (const file of allFiles) {
	if (/\.(ts|js|tsx|jsx)$/.test(file)) {
		entries.push(file)
	} else {
		const filename = path.basename(file)
		const dest = path.join(outdir, filename)
		fsExtra.ensureDirSync(outdir)
		fsExtra.copySync(file, dest)
		console.log(`copied: ${filename}`)
	}
}

console.log()
console.log('building...')

esbuild
	.build({
		entryPoints: entries,
		outdir,
		target: [`node${pkg.engines.node}`],
		platform: 'node',
		sourcemap: true,
		format: 'esm',
		logLevel: 'info',
	})
	.catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
