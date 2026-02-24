/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import tsconfigPaths from 'vite-tsconfig-paths'
import { envOnlyMacros } from 'vite-env-only'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [envOnlyMacros(), react(), tsconfigPaths()],
	optimizeDeps: {
		// Avoid Vite optimizing deps mid-test, which triggers reloads/flakiness.
		include: ['react-error-boundary'],
	},
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

