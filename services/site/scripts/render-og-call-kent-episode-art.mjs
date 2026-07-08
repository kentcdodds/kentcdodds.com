#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

execSync('npx vite-node scripts/render-og-call-kent-episode-art.ts', {
	cwd: siteRoot,
	stdio: 'inherit',
})
