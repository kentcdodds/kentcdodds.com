/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  cacheDirectory: './node_modules/.cache/remix',
  serverModuleFormat: 'cjs',
  serverPlatform: 'node',
  tailwind: true,
  postcss: true,
  watchPaths: ['./tailwind.config.ts'],
  future: {
    v2_headers: true,
    v2_normalizeFormMethod: true,
    v2_errorBoundary: true,
    v2_meta: true,
    // TODO: switch to remix-flat-routes
    v2_routeConvention: false,
    unstable_dev: true,
  },
}
