#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Directory containing `wrangler.dev.jsonc` (also the Vite project root). */
export const siteDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

/** Wrangler config used by local dev (`@cloudflare/vite-plugin`) and db scripts. */
export const wranglerDevConfigPath = path.join(siteDir, 'wrangler.dev.jsonc')

/**
 * Absolute Miniflare persistence root shared by wrangler CLI (`--persist-to`) and
 * `@cloudflare/vite-plugin` (`persistState.path`). Must match the directory wrangler
 * derives from `wrangler.dev.jsonc` (config dir + `.wrangler/state`), independent of
 * process cwd or Vite `root`.
 */
export const localD1PersistPath = path.join(siteDir, '.wrangler', 'state')

/** D1 sqlite files live under `…/v3/d1/miniflare-D1DatabaseObject/*.sqlite`. */
export const localD1StateDir = path.join(localD1PersistPath, 'v3', 'd1')
