import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_LITEFS_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../prisma',
)

/**
 * `litefs-js` throws if `process.env.LITEFS_DIR` is unset.
 *
 * In many non-Fly contexts (CI scripts, local "just run it" scenarios), we
 * still want the app/dev server to start. Any directory works for LiteFS
 * instance detection since missing `.primary` simply means "this instance is
 * primary".
 *
 * In production, leaving it unset is a misconfiguration and should fail fast,
 * so we do not apply the default there.
 */
export function ensureLitefsDirDefault() {
	const shouldDefault = process.env.NODE_ENV !== 'production'

	if (!process.env.LITEFS_DIR && shouldDefault) {
		process.env.LITEFS_DIR = DEFAULT_LITEFS_DIR
	}

	return process.env.LITEFS_DIR
}

// Ensure this is applied as early as possible for any server-only imports.
ensureLitefsDirDefault()
