const fsExtra = require('fs-extra')
const path = require('path')
const glob = require('glob')
const pkg = require('../package.json')

const here = (...s) => path.join(__dirname, ...s)

const allFiles = glob.sync(here('../server/**/*.*'), {
  ignore: ['**/tsconfig.json', '**/eslint*', '**/__tests__/**'],
})

const entries = []
for (const file of allFiles) {
  if (/\.(ts|js|tsx|jsx)$/.test(file)) {
    entries.push(file)
  } else {
    const dest = file.replace(here('../server'), here('../server-build'))
    fsExtra.ensureDir(path.parse(dest).dir)
    fsExtra.copySync(file, dest)
    console.log(`copied: ${file.replace(`${here('../server')}/`, '')}`)
  }
}

console.log()
console.log('building...')

require('esbuild')
  .build({
    entryPoints: glob.sync(here('../server/**/*.+(ts|js|tsx|jsx)')),
    outdir: here('../server-build'),
    target: [`node${pkg.engines.node}`],
    platform: 'node',
    format: 'cjs',
    logLevel: 'info',
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
