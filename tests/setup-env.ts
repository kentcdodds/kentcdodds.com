import fs from 'node:fs'
import path from 'node:path'
import { config as loadDotenv } from 'dotenv'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Many server modules now use `getEnv()` (validated runtime env) instead of
// reading `process.env` ad-hoc. Load `.env` (if present) and then `.env.example`
// as a fallback to ensure unit tests have a complete, non-secret config.
const cwd = process.cwd()
const dotenvPath = path.join(cwd, '.env')
if (fs.existsSync(dotenvPath)) {
	loadDotenv({ path: dotenvPath, override: false, quiet: true })
}
loadDotenv({ path: path.join(cwd, '.env.example'), override: false, quiet: true })

afterEach(cleanup)
