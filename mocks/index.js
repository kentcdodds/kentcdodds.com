const path = require('path')

require('ts-node').register({
  transpileOnly: true,
  files: true,
  project: path.join(__dirname, './tsconfig.json'),
})

require('./start')
