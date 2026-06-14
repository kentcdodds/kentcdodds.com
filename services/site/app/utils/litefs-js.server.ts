import os from 'node:os'
import * as litefs from 'litefs-js'
import * as litefsRemix from 'litefs-js/remix'

export const TXID_NUM_COOKIE_NAME = litefs.TXID_NUM_COOKIE_NAME

function isLitefsEnabled() {
	return process.env.LITEFS_ENABLED === 'true'
}

function getLocalInstanceInfo() {
	const currentInstance = process.env.FLY_MACHINE_ID ?? os.hostname()
	return {
		currentInstance,
		primaryInstance: currentInstance,
		currentIsPrimary: true,
	}
}

export async function getInstanceInfo(
	...args: Parameters<typeof litefs.getInstanceInfo>
) {
	if (!isLitefsEnabled()) return getLocalInstanceInfo()
	return litefs.getInstanceInfo(...args)
}

export function getInstanceInfoSync(
	...args: Parameters<typeof litefs.getInstanceInfoSync>
) {
	if (!isLitefsEnabled()) return getLocalInstanceInfo()
	return litefs.getInstanceInfoSync(...args)
}

export async function waitForUpToDateTxNumber(
	...args: Parameters<typeof litefs.waitForUpToDateTxNumber>
) {
	if (!isLitefsEnabled()) return true
	return litefs.waitForUpToDateTxNumber(...args)
}

export async function getTxNumber(
	...args: Parameters<typeof litefs.getTxNumber>
) {
	if (!isLitefsEnabled()) return 0
	return litefs.getTxNumber(...args)
}

export function getTxSetCookieHeader(
	...args: Parameters<typeof litefs.getTxSetCookieHeader>
) {
	return litefs.getTxSetCookieHeader(...args)
}

export async function checkCookieForTransactionalConsistency(
	...args: Parameters<typeof litefs.checkCookieForTransactionalConsistency>
) {
	if (!isLitefsEnabled()) return { type: 'ok' } as const
	return litefs.checkCookieForTransactionalConsistency(...args)
}

export function getInternalInstanceDomain(
	...args: Parameters<typeof litefs.getInternalInstanceDomain>
) {
	return litefs.getInternalInstanceDomain(...args)
}

export async function getAllInstances() {
	if (!isLitefsEnabled()) {
		const currentInstance = process.env.FLY_MACHINE_ID ?? os.hostname()
		return { [currentInstance]: process.env.FLY_REGION ?? 'local' }
	}
	return litefs.getAllInstances()
}

export async function ensurePrimary() {
	if (!isLitefsEnabled()) return true
	return litefsRemix.ensurePrimary()
}

export async function ensureInstance(
	...args: Parameters<typeof litefsRemix.ensureInstance>
) {
	if (!isLitefsEnabled()) return true
	return litefsRemix.ensureInstance(...args)
}

export function getReplayResponse(
	...args: Parameters<typeof litefsRemix.getReplayResponse>
) {
	return litefsRemix.getReplayResponse(...args)
}

export async function handleTransactionalConsistency(
	...args: Parameters<typeof litefsRemix.handleTransactionalConsistency>
) {
	if (!isLitefsEnabled()) return { type: 'ok' } as const
	return litefsRemix.handleTransactionalConsistency(...args)
}

export async function appendTxNumberCookie(
	...args: Parameters<typeof litefsRemix.appendTxNumberCookie>
) {
	if (!isLitefsEnabled()) return
	return litefsRemix.appendTxNumberCookie(...args)
}
