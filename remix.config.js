module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  routes(defineRoutes) {
    return defineRoutes(route => {
      if (process.env.ENABLE_TEST_ROUTES === 'true') {
        if (process.env.NODE_ENV === 'production' && process.env.FLY_APP_NAME) {
          console.warn(
            `🚨 🚨 🚨 🚨 ENABLE_TEST_ROUTES is true, NODE_ENV is "production" and FLY_APP_NAME is ${process.env.FLY_APP_NAME} so we're not going to enable test routes because this is probably a mistake. We do NOT want test routes enabled on Fly. 🚨 🚨 🚨 🚨 🚨`,
          )
          return
        }
        route('__tests/login', '__test_routes__/login.tsx')
      }
    })
  },
}
