import fs from 'node:fs/promises'

const defaultSleep = (durationMs) =>
	new Promise((resolve) => {
		const timer = setTimeout(resolve, durationMs)
		if (typeof timer?.unref === 'function') {
			timer.unref()
		}
	})

/**
 * Publish a compiled MDX artifact bundle via the worker endpoint.
 *
 * @param {string} bundlePath
 * @param {string} endpointUrl
 * @param {{
 *   secret?: string
 *   fetchImpl?: typeof fetch
 *   sleep?: (ms: number) => Promise<void>
 *   log?: Pick<typeof console, 'warn'>
 *   maxAttempts?: number
 *   retryDelayMs?: number
 * }} [options]
 */
export async function publishViaEndpoint(
	bundlePath,
	endpointUrl,
	{
		secret = process.env.REFRESH_CACHE_SECRET,
		fetchImpl = fetch,
		sleep = defaultSleep,
		log = console,
		maxAttempts = 8,
		retryDelayMs = 15_000,
	} = {},
) {
	if (!secret) {
		throw new Error('REFRESH_CACHE_SECRET is required for publishViaEndpoint')
	}

	const bundleRaw = await fs.readFile(bundlePath, 'utf8')
	const bundle = JSON.parse(bundleRaw)
	if (!bundle.version || typeof bundle.version !== 'string') {
		throw new Error('Bundle JSON must include a string "version" field')
	}

	let response
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		response = await fetchImpl(endpointUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				auth: secret,
			},
			body: bundleRaw,
		})
		if (response.ok) break
		if (attempt < maxAttempts) {
			log.warn(
				`Publish attempt ${attempt} failed (${response.status}); retrying in ${retryDelayMs / 1000}s...`,
			)
			await sleep(retryDelayMs)
		}
	}

	const responseText = await response.text()
	if (!response.ok) {
		throw new Error(
			`Artifact publish endpoint failed (${response.status}): ${responseText}`,
		)
	}

	let payload
	try {
		payload = JSON.parse(responseText)
	} catch {
		payload = responseText
	}

	return { version: bundle.version, payload, responseText }
}
