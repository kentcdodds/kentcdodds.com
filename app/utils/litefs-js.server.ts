import {
	TXID_NUM_COOKIE_NAME,
	waitForUpToDateTxNumber,
	getTxNumber,
	getTxSetCookieHeader,
	checkCookieForTransactionalConsistency,
	getInstanceInfo as getLiteFsInstanceInfo,
	getInstanceInfoSync as getLiteFsInstanceInfoSync,
	getInternalInstanceDomain as getLiteFsInternalInstanceDomain,
	getAllInstances as getLiteFsAllInstances,
	type LiteFSDir,
} from 'litefs-js'
import {
	appendTxNumberCookie as appendLiteFsTxNumberCookie,
	ensureInstance as ensureLiteFsInstance,
	ensurePrimary as ensureLiteFsPrimary,
	getReplayResponse as getLiteFsReplayResponse,
	handleTransactionalConsistency as handleLiteFsTransactionalConsistency,
} from 'litefs-js/remix'

type InstanceInfo = Awaited<ReturnType<typeof getLiteFsInstanceInfo>>

const FALLBACK_INSTANCE = 'local-instance'

export {
	TXID_NUM_COOKIE_NAME,
	waitForUpToDateTxNumber,
	getTxNumber,
	getTxSetCookieHeader,
	checkCookieForTransactionalConsistency,
}

export async function getInstanceInfo(litefsDir?: LiteFSDir) {
	if (!isLiteFsEnabled()) return getFallbackInstanceInfo()
	return getLiteFsInstanceInfo(litefsDir)
}

export function getInstanceInfoSync(litefsDir?: LiteFSDir) {
	if (!isLiteFsEnabled()) return getFallbackInstanceInfo()
	return getLiteFsInstanceInfoSync(litefsDir)
}

export function getInternalInstanceDomain(instance: string, port?: string) {
	if (!isLiteFsEnabled()) {
		const resolvedPort = port || process.env.INTERNAL_PORT || process.env.PORT || '8080'
		return `http://${instance}:${resolvedPort}`
	}
	return getLiteFsInternalInstanceDomain(instance, port)
}

export async function getAllInstances() {
	if (!isLiteFsEnabled()) {
		return {
			[FALLBACK_INSTANCE]: process.env.FLY_REGION ?? 'local',
		}
	}
	return getLiteFsAllInstances()
}

export async function ensurePrimary() {
	if (!isLiteFsEnabled()) return true
	return ensureLiteFsPrimary()
}

export async function ensureInstance(instance: string) {
	if (!isLiteFsEnabled()) return true
	return ensureLiteFsInstance(instance)
}

export function getReplayResponse(instance: string) {
	if (!isLiteFsEnabled()) {
		return new Response(`Replay disabled for ${instance}`, { status: 409 })
	}
	return getLiteFsReplayResponse(instance)
}

export async function handleTransactionalConsistency(request: Request) {
	if (!isLiteFsEnabled()) {
		return { type: 'ok' } as const
	}
	return handleLiteFsTransactionalConsistency(request)
}

export async function appendTxNumberCookie(request: Request, headers: Headers) {
	if (!isLiteFsEnabled()) return
	await appendLiteFsTxNumberCookie(request, headers)
}

function getFallbackInstanceInfo(): InstanceInfo {
	return {
		primaryInstance: FALLBACK_INSTANCE,
		currentInstance: FALLBACK_INSTANCE,
		currentIsPrimary: true,
	}
}

function isLiteFsEnabled() {
	return Boolean(process.env.FLY_APP_NAME && process.env.FLY_REGION)
}
