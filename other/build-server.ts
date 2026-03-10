import path from 'path'
import esbuild from 'esbuild'
import fsExtra from 'fs-extra'
import { globSync } from 'glob'

const siteRoot = process.cwd()
const pkg = fsExtra.readJsonSync(path.join(siteRoot, 'package.json'))

const globsafe = (s: string) => s.replace(/\\/g, '/')

const allFiles = globSync(globsafe(path.join(siteRoot, 'server/**/*.*')), {
	ignore: [
		globsafe(path.join(siteRoot, 'server/dev-server.ts')), // for development only
		globsafe(path.join(siteRoot, 'server/content-watcher.ts')), // for development only
		'**/tsconfig.json',
		'**/eslint*',
		'**/__tests__/**',
	],
})

const entries = []
const outdir = path.join(siteRoot, 'server-build')
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
