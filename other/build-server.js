const fsExtra = require('fs-extra')
const path = require('path')
const {globSync} = require('glob')
const pkg = require('../package.json')

const globsafe = s => s.replace(/\\/g, '/')
const here = (...s) => globsafe(path.join(__dirname, ...s))

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

require('esbuild')
  .build({
    entryPoints: entries,
    outdir,
    target: [`node${pkg.engines.node}`],
    platform: 'node',
    sourcemap: true,
    format: 'cjs',
    logLevel: 'info',
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
