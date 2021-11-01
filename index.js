if (process.env.NODE_ENV === 'production') {
  require('./server-build')
} else {
  require('esbuild-register/dist/node').register()
  require('./server')
}
