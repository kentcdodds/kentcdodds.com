const DEFAULT_LITEFS_DIR = './prisma'

/**
 * `litefs-js` throws if `process.env.LITEFS_DIR` is unset.
 *
 * In many non-Fly contexts (CI scripts, local "just run it" scenarios), we
 * still want the app/dev server to start. Any directory works for LiteFS
 * instance detection since missing `.primary` simply means "this instance is
 * primary".
 *
 * On Fly in production, leaving it unset is a misconfiguration and should fail
 * fast, so we do not apply the default there.
 */
export function ensureLitefsDirDefault() {
	const runningOnFly = Boolean(process.env.FLY_APP_NAME)
	const shouldDefault = !runningOnFly || process.env.NODE_ENV !== 'production'

	if (!process.env.LITEFS_DIR && shouldDefault) {
		process.env.LITEFS_DIR = DEFAULT_LITEFS_DIR
	}

	return process.env.LITEFS_DIR
}

// Ensure this is applied as early as possible for any server-only imports.
ensureLitefsDirDefault()

