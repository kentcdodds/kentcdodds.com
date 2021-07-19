module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  routes(defineRoutes) {
    return defineRoutes(route => {
      if (process.env.ENABLE_TEST_ROUTES === 'true') {
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            '⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ENABLE_TEST_ROUTES is true and NODE_ENV is "production". Make sure this is ok. ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️',
          )
        }
        if (process.env.FLY_REGION) {
          console.error(
            `🚨 🚨 🚨 🚨 ENABLE_TEST_ROUTES is true and FLY_REGION is ${process.env.FLY_REGION} so we're not going to enable test routes because this is probably a mistake. We do NOT want test routes enabled on Fly. 🚨 🚨 🚨 🚨 🚨`,
          )
          return
        }
        route('/__tests/login', '__test_routes__/login.tsx')
      }
    })
  },
}
