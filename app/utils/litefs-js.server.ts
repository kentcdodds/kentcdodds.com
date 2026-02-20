import {
	getInstanceInfo as baseGetInstanceInfo,
	getInstanceInfoSync as baseGetInstanceInfoSync,
	TXID_NUM_COOKIE_NAME,
	waitForUpToDateTxNumber as baseWaitForUpToDateTxNumber,
	getTxNumber as baseGetTxNumber,
	getTxSetCookieHeader,
	checkCookieForTransactionalConsistency as baseCheckCookieForTransactionalConsistency,
	getInternalInstanceDomain,
	getAllInstances,
} from 'litefs-js'

import {
	ensurePrimary as baseEnsurePrimary,
	ensureInstance as baseEnsureInstance,
	getReplayResponse,
	handleTransactionalConsistency as baseHandleTransactionalConsistency,
	appendTxNumberCookie as baseAppendTxNumberCookie,
} from 'litefs-js/remix'

// `litefs-js` throws if `LITEFS_DIR` is missing, but many scripts (like the
// semantic-search indexers) intentionally start the dev server without loading a
// local `.env`. Default to the same value as `.env.example` when the value is
// actually needed so dotenv can still override if it loads later.
const defaultLitefsDir = './prisma'

const resolveLitefsDir = (litefsDir?: string): string =>
	litefsDir || process.env.LITEFS_DIR || defaultLitefsDir

function withLitefsDirEnv<T>(litefsDir: string, fn: () => T): T {
	const existingLitefsDir = process.env.LITEFS_DIR
	if (existingLitefsDir) {
		return fn()
	}

	process.env.LITEFS_DIR = litefsDir

	const restore = () => {
		if (existingLitefsDir === undefined) {
			if (process.env.LITEFS_DIR === litefsDir) {
				delete process.env.LITEFS_DIR
			}
			return
		}

		process.env.LITEFS_DIR = existingLitefsDir
	}

	try {
		const result = fn()
		if (result && typeof (result as Promise<unknown>).finally === 'function') {
			return (result as Promise<unknown>).finally(restore) as T
		}
		restore()
		return result
	} catch (error) {
		restore()
		throw error
	}
}

const getInstanceInfo: typeof baseGetInstanceInfo = litefsDir =>
	baseGetInstanceInfo(resolveLitefsDir(litefsDir))

const getInstanceInfoSync: typeof baseGetInstanceInfoSync = litefsDir =>
	baseGetInstanceInfoSync(resolveLitefsDir(litefsDir))

const waitForUpToDateTxNumber: typeof baseWaitForUpToDateTxNumber = (
	clientTxNumber,
	options,
) => {
	const resolvedOptions: NonNullable<
		Parameters<typeof baseWaitForUpToDateTxNumber>[1]
	> = {
		...options,
		litefsDir: resolveLitefsDir(options?.litefsDir),
	}

	return withLitefsDirEnv(resolvedOptions.litefsDir, () =>
		baseWaitForUpToDateTxNumber(clientTxNumber, resolvedOptions),
	)
}

const getTxNumber: typeof baseGetTxNumber = (litefsDir, databaseFilename) =>
	baseGetTxNumber(resolveLitefsDir(litefsDir), databaseFilename)

const checkCookieForTransactionalConsistency: typeof baseCheckCookieForTransactionalConsistency =
	(...args) => {
		return withLitefsDirEnv(resolveLitefsDir(), () =>
			baseCheckCookieForTransactionalConsistency(...args),
		)
	}

const ensurePrimary: typeof baseEnsurePrimary = (...args) => {
	return withLitefsDirEnv(resolveLitefsDir(), () =>
		baseEnsurePrimary(...args),
	)
}

const ensureInstance: typeof baseEnsureInstance = (...args) => {
	return withLitefsDirEnv(resolveLitefsDir(), () =>
		baseEnsureInstance(...args),
	)
}

const handleTransactionalConsistency: typeof baseHandleTransactionalConsistency =
	(...args) => {
		return withLitefsDirEnv(resolveLitefsDir(), () =>
			baseHandleTransactionalConsistency(...args),
		)
	}

const appendTxNumberCookie: typeof baseAppendTxNumberCookie = (...args) => {
	return withLitefsDirEnv(resolveLitefsDir(), () =>
		baseAppendTxNumberCookie(...args),
	)
}

export {
	getInstanceInfo,
	getInstanceInfoSync,
	TXID_NUM_COOKIE_NAME,
	waitForUpToDateTxNumber,
	getTxNumber,
	getTxSetCookieHeader,
	checkCookieForTransactionalConsistency,
	getInternalInstanceDomain,
	getAllInstances,
}

export {
	ensurePrimary,
	ensureInstance,
	getReplayResponse,
	handleTransactionalConsistency,
	appendTxNumberCookie,
}
