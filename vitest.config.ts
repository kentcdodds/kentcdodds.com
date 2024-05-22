/// <reference types="vitest" />
/// <reference types="vite/client" />

import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/__tests__/**.{js,jsx,ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup-env.ts'],
  },
})
