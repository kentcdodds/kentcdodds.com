import * as React from 'react'
import { ErrorPanel } from '#app/components/form-elements.tsx'
import { type SearchResult } from '@kcd-internal/search-shared'

export type ResolvedSearch = {
	q: string
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
}

/**
 * Soft-degrade path for deferred searchPayload errors (e.g. worker timeout).
 * Clears prior `resolved` results so a timed-out query cannot keep showing
 * hits from the previous successful query.
 */
export function ClearResolvedSearchError({
	q,
	message,
	setResolved,
}: {
	q: string
	message: string
	setResolved: React.Dispatch<React.SetStateAction<ResolvedSearch | null>>
}) {
	// Layout effect so prior hits are cleared before paint — a useEffect would
	// leave stale SearchResults visible for one frame beside the error panel.
	React.useLayoutEffect(() => {
		setResolved(null)
	}, [q, setResolved])

	return <ErrorPanel>{message}</ErrorPanel>
}
