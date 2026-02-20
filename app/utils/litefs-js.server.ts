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
	litefsDir ?? process.env.LITEFS_DIR ?? defaultLitefsDir

let litefsDirEnvOverrideCount = 0
let litefsDirEnvLock = Promise.resolve()

async function withLitefsDirEnv<T>(
	litefsDir: string,
	fn: () => T,
): Promise<Awaited<T>> {
	const existingLitefsDir = process.env.LITEFS_DIR
	if (existingLitefsDir !== undefined && litefsDirEnvOverrideCount === 0) {
		return await fn()
	}

	let releaseLock!: () => void
	const lock = new Promise<void>(resolve => {
		releaseLock = resolve
	})
	const previousLock = litefsDirEnvLock
	litefsDirEnvLock = litefsDirEnvLock.then(() => lock)

	await previousLock

	const previousLitefsDir = process.env.LITEFS_DIR
	litefsDirEnvOverrideCount += 1
	process.env.LITEFS_DIR = litefsDir

	const restore = () => {
		litefsDirEnvOverrideCount -= 1
		if (previousLitefsDir === undefined) {
			if (process.env.LITEFS_DIR === litefsDir) {
				delete process.env.LITEFS_DIR
			}
			return
		}

		process.env.LITEFS_DIR = previousLitefsDir
	}

	try {
		return await fn()
	} finally {
		restore()
		releaseLock()
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
