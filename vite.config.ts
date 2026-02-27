import 'dotenv/config'
import { reactRouter } from '@react-router/dev/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { envOnlyMacros } from 'vite-env-only'
import { cjsInterop } from 'vite-plugin-cjs-interop'
import tsconfigPaths from 'vite-tsconfig-paths'

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
		build: {
			// This is an OSS project, so it's fine to generate "regular" sourcemaps.
			// If we ever want sourcemaps upload without exposing them publicly, switch
			// to `sourcemap: 'hidden'` (and keep uploading to Sentry).
			sourcemap: true,
			cssMinify: MODE === 'production',
			rollupOptions: {
				external: [/node:.*/, 'stream', 'crypto', /\.wasm\?module$/],
			},
		},
	}
})
