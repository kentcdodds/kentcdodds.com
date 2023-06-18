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
    v2_normalizeFormMethod: true,
    // TODO: enable these
    v2_errorBoundary: false,
    v2_meta: false,
    // TODO: switch to remix-flat-routes
    v2_routeConvention: false,
    unstable_dev: true,
  },
}
