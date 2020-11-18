const path = require('path')

if (process.env.NODE_ENV === 'production') {
  require('./server-build/start')
} else {
  require('ts-node').register({
    dir: path.resolve('server'),
    pretty: true,
    transpileOnly: true,
    ignore: ['/node_modules/, /__tests__/'],
    project: require.resolve('./server/tsconfig.json'),
  })
  require('./server/start')
}
