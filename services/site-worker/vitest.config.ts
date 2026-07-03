import { defineConfig } from 'vitest/config'
import './scripts/ensure-dist-placeholders.mjs'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
	},
})
