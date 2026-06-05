import { getEnv } from './env.server.ts'

export function getInstanceInfoSync() {
	const env = getEnv()
	const currentInstance = env.FLY_MACHINE_ID
	return {
		currentInstance,
		primaryInstance: currentInstance,
		currentIsPrimary: true,
	}
}

export async function getInstanceInfo() {
	return getInstanceInfoSync()
}

export async function getAllInstances() {
	const env = getEnv()
	const { currentInstance } = getInstanceInfoSync()
	return { [currentInstance]: env.FLY_REGION }
}

export async function ensureInstance(_instance: string) {}
