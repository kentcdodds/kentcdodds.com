module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  routes(defineRoutes) {
    return defineRoutes(route => {
      if (process.env.ENABLE_TEST_ROUTES === 'true') {
        if (process.env.NODE_ENV === 'production') {
          console.log(
            '⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ TEST ROUTES ARE ENABLED and NODE_ENV is production. Make sure this is ok. ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️',
          )
        }
        route('/__tests/login', '__test_routes__/login.tsx')
      }
    })
  },
}
