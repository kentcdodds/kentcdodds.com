const path = require('path')

require('ts-node').register({
  transpileOnly: true,
  files: true,
  compilerOptions: {
    module: 'commonjs',
  },
  project: path.join(__dirname, './tsconfig.json'),
})

require('./seeder')
