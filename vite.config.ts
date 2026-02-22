import 'dotenv/config'
import { reactRouter } from '@react-router/dev/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
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
			envOnlyMacros(),
			tailwindcss(),
			reactRouter(),
			tsconfigPaths(),
			process.env.SENTRY_UPLOAD
				? sentryVitePlugin({
						disable: MODE !== 'production',
						authToken: process.env.SENTRY_AUTH_TOKEN,
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT,
						// By default the bundler plugin logs and continues on upload/release
						// errors. If we then also delete maps, Sentry ends up trying to fetch
						// `*.map` and receiving our HTML 404 page instead.
						errorHandler: (err) => {
							throw err
						},
						release: {
							name: process.env.COMMIT_SHA,
							setCommits: {
								auto: true,
							},
						},
						sourcemaps: {
							// NOTE: This option expects globs (or a Promise resolving to globs),
							// not the *result* of running glob at config-eval time.
							//
							// We only delete Vite/React Router client maps here. The `server-build`
							// sourcemaps are produced by a separate esbuild step and are not uploaded
							// by this plugin.
							filesToDeleteAfterUpload: ['./build/client/**/*.map'],
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
