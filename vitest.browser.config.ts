/// <reference types="vitest" />
/// <reference types="vite/client" />

import { reactRouter } from '@react-router/dev/vite'
import { playwright } from '@vitest/browser-playwright'
import tsconfigPaths from 'vite-tsconfig-paths'
import { envOnlyMacros } from 'vite-env-only'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [envOnlyMacros(), reactRouter(), tsconfigPaths()],
	test: {
		include: ['**/*.test.browser.{js,jsx,ts,tsx}'],
		exclude: [...configDefaults.exclude],
		setupFiles: ['./tests/setup-browser.ts'],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
		},
	},
})

