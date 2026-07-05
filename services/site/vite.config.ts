import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import { cjsInterop } from 'vite-plugin-cjs-interop'
import tsconfigPaths from 'vite-tsconfig-paths'
import { mdxDevManifestPlugin } from './other/vite-plugins/mdx-dev-manifest.ts'
import { localD1PersistPath } from './scripts/local-d1-state.mjs'

const MODE = process.env.NODE_ENV
const SENTRY_UPLOAD =
	process.env.SENTRY_UPLOAD === 'true' || process.env.SENTRY_UPLOAD === '1'

if (SENTRY_UPLOAD && MODE === 'production') {
	const authToken = process.env.SENTRY_AUTH_TOKEN
	const project = process.env.SENTRY_PROJECT
	const org = process.env.SENTRY_ORG
	// New-style Sentry auth tokens (prefix "sntrys_") embed the org, so SENTRY_ORG
	// is not required when using one.
	const tokenImpliesOrg = Boolean(authToken?.startsWith('sntrys_'))

	// If upload is "on" but required settings are missing, the Sentry plugin will
	// just warn + skip the upload. Fail fast so we don't silently deploy without
	// sourcemaps in Sentry.
	if (!authToken) {
		throw new Error(
			'SENTRY_UPLOAD is enabled, but SENTRY_AUTH_TOKEN is missing',
		)
	}
	if (!project) {
		throw new Error('SENTRY_UPLOAD is enabled, but SENTRY_PROJECT is missing')
	}
	if (!org && !tokenImpliesOrg) {
		throw new Error('SENTRY_UPLOAD is enabled, but SENTRY_ORG is missing')
	}
	if (!process.env.COMMIT_SHA) {
		throw new Error('SENTRY_UPLOAD is enabled, but COMMIT_SHA is missing')
	}
}

const siteDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async ({ command }) => {
	const isDevServer = command === 'serve'
	return {
		plugins: [
			isDevServer
				? cloudflare({
						configPath: './wrangler.dev.jsonc',
						viteEnvironment: { name: 'ssr' },
						persistState: { path: localD1PersistPath },
					})
				: null,
			isDevServer ? mdxDevManifestPlugin() : null,
			// cjsInterop's SSR transforms break in workerd (TDZ on __cjsInterop*__).
			// Production SSR build targets Node; dev SSR runs in the CF vite plugin runtime.
			!isDevServer
				? cjsInterop({
						dependencies: [
							'md5-hash',
							'@remark-embedder/core',
							'@remark-embedder/transformer-oembed',
						],
					})
				: null,
			envOnlyMacros(),
			tailwindcss(),
			reactRouter(),
			tsconfigPaths(),
			SENTRY_UPLOAD
				? sentryVitePlugin({
						disable: MODE !== 'production',
						authToken: process.env.SENTRY_AUTH_TOKEN,
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT,
						// By default the bundler plugin logs and continues on upload/release
						// errors. Fail the build so we don't deploy with broken symbolication.
						errorHandler: (err) => {
							throw err
						},
						release: {
							name: process.env.COMMIT_SHA,
							setCommits: {
								auto: true,
							},
						},
					})
				: null,
		],
		server: {
			port: Number(process.env.PORT || 3000),
			strictPort: true,
		},
		// Pre-bundle client deps that are only imported from lazily-visited
		// routes. Without this, the first visit to e.g. /blog triggers a Vite
		// re-optimization that restarts the workerd runtime mid-request and
		// surfaces as a one-off 500 in dev.
		optimizeDeps: isDevServer
			? {
					include: [
						'buffer',
						'@tanstack/react-hotkeys',
						'clsx',
						'framer-motion',
						'spin-delay',
						'error-stack-parser',
						'@sentry/react-router',
						'md5-hash',
						'lru-cache',
						'mdx-bundler/client/index.js',
						'@epic-web/client-hints',
						'@epic-web/client-hints/color-scheme',
						'@epic-web/client-hints/time-zone',
						'@conform-to/zod/v4',
						'zod',
						'downshift',
						'date-fns',
						'@reach/dialog',
						'@epic-web/invariant',
					],
				}
			: undefined,
		define: isDevServer
			? {
					__MDX_DEV_CACHE_ROOT__: JSON.stringify(
						path.join(siteDir, 'node_modules/.cache/mdx-dev'),
					),
				}
			: undefined,
		resolve: isDevServer
			? {
					alias: [
						{
							find: 'bcrypt',
							replacement: path.join(siteDir, 'other/stubs/bcrypt.ts'),
						},
						{
							find: 'better-sqlite3',
							replacement: path.join(
								siteDir,
								'other/stubs/better-sqlite3-stub.ts',
							),
						},
						{
							find: 'esbuild',
							replacement: path.join(siteDir, 'other/stubs/esbuild.ts'),
						},
						{
							find: /^mdx-bundler$/,
							replacement: path.join(siteDir, 'other/stubs/mdx-bundler.ts'),
						},
					],
				}
			: undefined,
		build: {
			// This is an OSS project, so it's fine to generate "regular" sourcemaps.
			// If we ever want sourcemaps upload without exposing them publicly, switch
			// to `sourcemap: 'hidden'` (and keep uploading to Sentry).
			sourcemap: true,
			cssMinify: MODE === 'production',
			rollupOptions: {
				external: [/node:.*/, 'stream', 'crypto'],
			},
		},
	}
})
