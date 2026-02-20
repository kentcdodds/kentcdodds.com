import {
	UNSAFE_SingleFetchRedirectSymbol,
	UNSAFE_decodeViaTurboStream,
} from 'react-router'

type SingleFetchDecodeResult =
	| {
			type: 'redirect'
			redirect: string
			replace: boolean
	  }
	| {
			type: 'data'
			data: unknown
	  }
	| {
			type: 'error'
			error: unknown
	  }
	| {
			type: 'unknown'
	  }

/**
 * NOTE: This helper intentionally isolates React Router UNSAFE APIs:
 * - https://api.reactrouter.com/v7/functions/react_router.UNSAFE_decodeViaTurboStream.html
 * - https://api.reactrouter.com/v7/variables/react_router.UNSAFE_SingleFetchRedirectSymbol.html
 *
 * We currently depend on this for manual `.data` single-fetch submissions.
 * Re-evaluate this implementation on every React Router v7 upgrade.
 */
async function decodeSingleFetchResponse(
	body: ReadableStream<Uint8Array>,
): Promise<SingleFetchDecodeResult> {
	if (typeof UNSAFE_decodeViaTurboStream !== 'function') {
		throw new Error('react-router turbo decoder is unavailable')
	}

	const decoded = await UNSAFE_decodeViaTurboStream(body, window)
	const result = decoded.value
	if (!result || typeof result !== 'object') {
		return { type: 'unknown' }
	}

	const resultRecord = result as Record<PropertyKey, unknown>
	const symbolRedirect = resultRecord[UNSAFE_SingleFetchRedirectSymbol]
	if (symbolRedirect && typeof symbolRedirect === 'object') {
		const redirectData = symbolRedirect as Record<string, unknown>
		const redirectTo = redirectData.redirect
		if (typeof redirectTo === 'string') {
			return {
				type: 'redirect',
				redirect: redirectTo,
				replace: redirectData.replace === true,
			}
		}
	}

	if ('data' in resultRecord) {
		return { type: 'data', data: resultRecord.data }
	}

	if ('error' in resultRecord) {
		return { type: 'error', error: resultRecord.error }
	}

	for (const routeResult of Object.values(resultRecord)) {
		if (!routeResult || typeof routeResult !== 'object') {
			continue
		}
		const routeRecord = routeResult as Record<string, unknown>
		if ('data' in routeRecord) {
			return { type: 'data', data: routeRecord.data }
		}
		if ('error' in routeRecord) {
			return { type: 'error', error: routeRecord.error }
		}
	}

	return { type: 'unknown' }
}

export { decodeSingleFetchResponse }
