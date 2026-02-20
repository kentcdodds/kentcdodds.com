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

function ensureLitefsDir() {
	if (!process.env.LITEFS_DIR) {
		process.env.LITEFS_DIR = defaultLitefsDir
	}
}

const getInstanceInfo: typeof baseGetInstanceInfo = (...args) => {
	if (!args[0]) {
		ensureLitefsDir()
	}
	return baseGetInstanceInfo(...args)
}

const getInstanceInfoSync: typeof baseGetInstanceInfoSync = (...args) => {
	if (!args[0]) {
		ensureLitefsDir()
	}
	return baseGetInstanceInfoSync(...args)
}

const waitForUpToDateTxNumber: typeof baseWaitForUpToDateTxNumber = (
	...args
) => {
	if (!args[1]?.litefsDir) {
		ensureLitefsDir()
	}
	return baseWaitForUpToDateTxNumber(...args)
}

const getTxNumber: typeof baseGetTxNumber = (...args) => {
	if (!args[0]) {
		ensureLitefsDir()
	}
	return baseGetTxNumber(...args)
}

const checkCookieForTransactionalConsistency: typeof baseCheckCookieForTransactionalConsistency =
	(...args) => {
		ensureLitefsDir()
		return baseCheckCookieForTransactionalConsistency(...args)
	}

const ensurePrimary: typeof baseEnsurePrimary = (...args) => {
	ensureLitefsDir()
	return baseEnsurePrimary(...args)
}

const ensureInstance: typeof baseEnsureInstance = (...args) => {
	ensureLitefsDir()
	return baseEnsureInstance(...args)
}

const handleTransactionalConsistency: typeof baseHandleTransactionalConsistency =
	(...args) => {
		ensureLitefsDir()
		return baseHandleTransactionalConsistency(...args)
	}

const appendTxNumberCookie: typeof baseAppendTxNumberCookie = (...args) => {
	ensureLitefsDir()
	return baseAppendTxNumberCookie(...args)
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
