module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  routes(defineRoutes) {
    return defineRoutes(route => {
      console.log({ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES})
      if (process.env.ENABLE_TEST_ROUTES === 'true') {
        route('/__tests/login', '__test_routes__/login.tsx')
      }
    })
  },
}
