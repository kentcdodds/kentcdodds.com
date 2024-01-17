import {unstable_vitePlugin as remix} from '@remix-run/dev'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import {flatRoutes} from 'remix-flat-routes'
import envOnly from 'vite-env-only'
import {cjsInterop} from 'vite-plugin-cjs-interop'

const MODE = process.env.NODE_ENV

export default defineConfig(() => {
  return {
    plugins: [
      cjsInterop({
        dependencies: [
          '@remark-embedder/core',
          '@remark-embedder/transformer-oembed',
        ],
      }),
      envOnly(),
      remix({
        ignoredRouteFiles: ['**/*'],
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
      cssMinify: MODE === 'production',
      rollupOptions: {
        external: [/node:.*/, 'stream', 'crypto'],
      },
    },
  }
})
