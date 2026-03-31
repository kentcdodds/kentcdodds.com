import { getEnv } from '#app/utils/env.server.ts'

export type CloudflareVectorizeDeleteResponse = {
	success?: boolean
	errors?: unknown[]
	messages?: unknown[]
	result?: { deleted?: number }
}

function getCloudflareApiBaseUrl() {
	return 'https://api.cloudflare.com/client/v4'
}

const vectorizeRequestTimeoutMs = 10_000

function getRequiredVectorizeEnv() {
	const env = getEnv()
	return {
		accountId: env.CLOUDFLARE_ACCOUNT_ID,
		apiToken: env.CLOUDFLARE_API_TOKEN,
		indexName: env.CLOUDFLARE_VECTORIZE_INDEX,
	}
}

export async function vectorizeDeleteByIds({
	ids,
}: {
	ids: string[]
}): Promise<CloudflareVectorizeDeleteResponse> {
	if (!Array.isArray(ids) || ids.length === 0) {
		return { result: { deleted: 0 } }
	}
	if (ids.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
		throw new TypeError('ids must be a non-empty array of non-empty strings')
	}

	const { accountId, apiToken, indexName } = getRequiredVectorizeEnv()
	const body = JSON.stringify({ ids })

	const doFetch = async (path: string) => {
		const url = `${getCloudflareApiBaseUrl()}/accounts/${accountId}${path}`
		const controller = new AbortController()
		const timeout = setTimeout(
			() => controller.abort(),
			vectorizeRequestTimeoutMs,
		)
		try {
			return await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body,
				signal: controller.signal,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(`Cloudflare API transport error (${path}): ${message}`, {
				cause: error,
			})
		} finally {
			clearTimeout(timeout)
		}
	}

	const throwIfNotOk = async (response: Response, path: string) => {
		if (response.ok) return
		const text = await response.text().catch(() => '')
		throw new Error(
			`Cloudflare API request failed: ${response.status} ${response.statusText} (${path})${text ? `\n${text}` : ''}`,
		)
	}

	const v2Path = `/vectorize/v2/indexes/${indexName}/delete_by_ids`
	const v2Response = await doFetch(v2Path)
	if (v2Response.status === 404 || v2Response.status === 405) {
		const legacyPath = `/vectorize/indexes/${indexName}/delete_by_ids`
		const legacyResponse = await doFetch(legacyPath)
		await throwIfNotOk(legacyResponse, legacyPath)
		return (await legacyResponse.json()) as CloudflareVectorizeDeleteResponse
	}

	await throwIfNotOk(v2Response, v2Path)
	return (await v2Response.json()) as CloudflareVectorizeDeleteResponse
}
