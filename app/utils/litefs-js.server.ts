// `litefs-js` throws if `LITEFS_DIR` is missing, but many scripts (like the
// semantic-search indexers) intentionally start the dev server without loading a
// local `.env`. Default to the same value as `.env.example` so non-LiteFS
// environments can still boot and treat the current instance as primary.
if (!process.env.LITEFS_DIR) {
	process.env.LITEFS_DIR = './prisma'
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
} from 'litefs-js'

export {
	ensurePrimary,
	ensureInstance,
	getReplayResponse,
	handleTransactionalConsistency,
	appendTxNumberCookie,
} from 'litefs-js/remix'
