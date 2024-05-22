import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { flatRoutes } from 'remix-flat-routes'
import envOnly from 'vite-env-only'
import { metronome } from 'metronome-sh/vite'
import { cjsInterop } from 'vite-plugin-cjs-interop'

const MODE = process.env.NODE_ENV

export default defineConfig(() => {
	return {
		plugins: [
			cjsInterop({
				dependencies: [
					'md5-hash',
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
			metronome(),
		],
		build: {
			cssMinify: MODE === 'production',
			rollupOptions: {
				external: [/node:.*/, 'stream', 'crypto'],
			},
		},
	}
})
