import './litefs-dir-default.server.ts'

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
