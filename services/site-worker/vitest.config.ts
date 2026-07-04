import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import './scripts/ensure-dist-placeholders.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			'cloudflare:workers': path.resolve(
				__dirname,
				'src/test-utils/cloudflare-workers-stub.ts',
			),
		},
	},
	test: {
		globals: true,
		environment: 'node',
	},
})
