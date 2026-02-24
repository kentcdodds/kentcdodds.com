/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		include: ['**/__tests__/**.{js,jsx,ts,tsx}'],
		exclude: ['**/*.test.browser.{js,jsx,ts,tsx}'],
		environment: 'node',
		setupFiles: ['./tests/setup-backend.ts'],
	},
})
