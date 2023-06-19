/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  serverModuleFormat: 'cjs',
  future: {
    v2_headers: true,
    v2_normalizeFormMethod: true,
    // TODO: enable these
    v2_errorBoundary: false,
    v2_meta: true,
    // TODO: switch to remix-flat-routes
    v2_routeConvention: false,
  },
}
