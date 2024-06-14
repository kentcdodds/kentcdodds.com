import 'dotenv/config'
import { vitePlugin as remix } from '@remix-run/dev'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { glob } from 'glob'
import { metronome } from 'metronome-sh/vite'
import { flatRoutes } from 'remix-flat-routes'
import { defineConfig } from 'vite'
import envOnly from 'vite-env-only'
import { cjsInterop } from 'vite-plugin-cjs-interop'
import tsconfigPaths from 'vite-tsconfig-paths'

const MODE = process.env.NODE_ENV

export default defineConfig(async () => {
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
				routes: async (defineRoutes) => {
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
			process.env.SENTRY_UPLOAD
				? sentryVitePlugin({
						disable: MODE !== 'production',
						authToken: process.env.SENTRY_AUTH_TOKEN,
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT,
						release: {
							name: process.env.COMMIT_SHA,
							setCommits: {
								auto: true,
							},
						},
						sourcemaps: {
							filesToDeleteAfterUpload: await glob([
								'./build/**/*.map',
								'.server-build/**/*.map',
							]),
						},
					})
				: null,
		],
		build: {
			cssMinify: MODE === 'production',
			rollupOptions: {
				external: [/node:.*/, 'stream', 'crypto'],
			},
		},
	}
})
