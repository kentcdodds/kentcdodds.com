module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  routes(defineRoutes) {
    return defineRoutes(route => {
      if (process.env.NODE_ENV !== 'production') {
        route('/__tests/login', '__test_routes__/login.tsx')
      }
    })
  },
}
