if (process.env.NODE_ENV === 'production') {
  require('./server-build')
} else {
  // TODO: check that we're running within TSX and warn if not
  require('./server')
}
