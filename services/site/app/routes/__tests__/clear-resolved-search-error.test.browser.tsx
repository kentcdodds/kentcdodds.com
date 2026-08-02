import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import * as React from 'react'
import {
	ClearResolvedSearchError,
	type ResolvedSearch,
} from '../clear-resolved-search-error.tsx'

test('clears stale resolved results when the current query soft-errors', async () => {
	function Harness() {
		const [resolved, setResolved] = React.useState<ResolvedSearch | null>({
			q: 'micro',
			results: [],
			lowRankingResults: [],
			noCloseMatches: false,
		})

		return (
			<div>
				<div data-testid="resolved-q">{resolved?.q ?? 'none'}</div>
				<ClearResolvedSearchError
					q="microfrontend"
					message="Search is temporarily unavailable. Please try again."
					setResolved={setResolved}
				/>
			</div>
		)
	}

	const screen = await render(<Harness />)
	await expect
		.element(screen.getByTestId('resolved-q'))
		.toHaveTextContent('none')
	await expect
		.element(
			screen.getByText(
				'Search is temporarily unavailable. Please try again.',
			),
		)
		.toBeInTheDocument()
})
