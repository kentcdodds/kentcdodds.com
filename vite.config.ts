import {unstable_vitePlugin as remix} from '@remix-run/dev'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import {flatRoutes} from 'remix-flat-routes'
import envOnly from 'vite-env-only'

export default defineConfig(() => {
  return {
    plugins: [
      envOnly(),
      remix({
        ignoredRouteFiles: ['**/*'],
        serverModuleFormat: 'esm',
        routes: async defineRoutes => {
          return flatRoutes('routes', defineRoutes, {
            ignoredRouteFiles: [
              '.*',
              '**/*.css',
              '**/*.test.{js,jsx,ts,tsx}',
              '**/__*.*',
            ],
          })
        },
      }),
      tsconfigPaths(),
    ],
    build: {
      rollupOptions: {
        external: [/node:.*/, 'stream', 'crypto'],
      },
    },
  }
})
