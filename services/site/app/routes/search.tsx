import React, { Suspense } from 'react'
import {
	data as defer,
	Await,
	Link,
	useAsyncError,
	useFetcher,
} from 'react-router'
import { Button } from '#app/components/button.tsx'
import {
	ErrorPanel,
	Input,
	inputClassName,
} from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H3, H4, Paragraph } from '#app/components/typography.tsx'
import { images } from '#app/images.tsx'
import {
	getErrorMessage,
	useDebounce,
	useUpdateQueryStringValueWithoutNavigation,
} from '#app/utils/misc-react.tsx'
import {
	SEARCH_MAX_QUERY_CHARS,
	type SearchResult,
} from '@kcd-internal/search-shared'
import { searchKCD } from '#app/utils/search.server.ts'
import { type Route } from './+types/search'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const q = (url.searchParams.get('q') ?? '').trim()
	const headers = { 'Cache-Control': 'no-store' }

	const emptyPayload = Promise.resolve({
		results: [] as Array<SearchResult>,
		lowRankingResults: [] as Array<SearchResult>,
		noCloseMatches: false,
	})

	if (!q) {
		return defer(
			{
				q: '',
				configured: true,
				searchPayload: emptyPayload,
				error: undefined as string | undefined,
			},
			{ headers },
		)
	}
	const normalizedQ = q.trim().replace(/\s+/g, ' ')
	if (normalizedQ.length > SEARCH_MAX_QUERY_CHARS) {
		return defer(
			{
				q,
				configured: true,
				searchPayload: emptyPayload,
				error: `Query too long (${normalizedQ.length} chars). Max is ${SEARCH_MAX_QUERY_CHARS}.`,
			},
			{ headers },
		)
	}

	const searchPayload = searchKCD({
		query: normalizedQ,
		topK: 8,
		request,
	}).catch((e) => {
		console.error(e)
		throw e
	})
	return defer(
		{
			q,
			configured: true,
			searchPayload,
			error: undefined as string | undefined,
		},
		{ headers },
	)
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
	const fetcher = useFetcher<typeof loader>({ key: 'search-page-results' })
	const { load } = fetcher
	const inputRef = React.useRef<HTMLInputElement>(null)

	const [query, setQuery] = React.useState(loaderData.q)
	const trimmedQuery = query.trim()

	// Keep the URL shareable without triggering loader navigations on each keypress.
	useUpdateQueryStringValueWithoutNavigation('q', trimmedQuery)

	const [requestedQuery, setRequestedQuery] = React.useState(trimmedQuery)

	type Resolved = {
		q: string
		results: Array<SearchResult>
		lowRankingResults: Array<SearchResult>
		noCloseMatches: boolean
	}
	const [resolved, setResolved] = React.useState<Resolved | null>(null)

	React.useEffect(() => {
		setQuery(loaderData.q)
		setRequestedQuery(loaderData.q)
		setResolved(null)
	}, [loaderData.q])

	React.useEffect(() => {
		if (!trimmedQuery) {
			setResolved(null)
			setRequestedQuery('')
		}
	}, [trimmedQuery])

	const debouncedRequestSearch = useDebounce((nextQuery: string) => {
		if (nextQuery === requestedQuery) return
		setRequestedQuery(nextQuery)
		if (!nextQuery) return
		// If the loader already fetched this query (e.g. initial page load), reuse it.
		if (nextQuery === loaderData.q) return
		void load(`/search?q=${encodeURIComponent(nextQuery)}`)
	}, 250)

	React.useEffect(() => {
		// Schedule a debounced fetch; calling with '' cancels any pending timer.
		// Immediate UI clearing happens in the `trimmedQuery` effect above.
		debouncedRequestSearch(trimmedQuery)
	}, [debouncedRequestSearch, trimmedQuery])

	const isQueryPending = trimmedQuery !== requestedQuery

	const activeData =
		requestedQuery && loaderData.q === requestedQuery
			? loaderData
			: fetcher.data?.q === requestedQuery
				? fetcher.data
				: null

	const error = activeData?.error

	const showResultsSection = trimmedQuery && !error
	const isPending =
		Boolean(showResultsSection) &&
		(isQueryPending || (resolved ? resolved.q !== requestedQuery : false))
	const resultsContainerClassName = isPending
		? 'transition-opacity opacity-60'
		: 'transition-opacity'
	const shouldAwaitResults =
		Boolean(showResultsSection) &&
		Boolean(activeData) &&
		resolved?.q !== requestedQuery

	const searchPayloadPromise =
		activeData && 'searchPayload' in activeData
			? activeData.searchPayload
			: null

	return (
		<div>
			<HeroSection
				title="Search"
				subtitle="Search across posts, pages, podcasts, talks, YouTube videos, resume, credits, and testimonials."
				imageBuilder={images.kodyProfileGray}
				action={
					<fetcher.Form
						method="get"
						action="/search"
						role="search"
						className="w-full"
						onSubmit={(event) => {
							event.preventDefault()
							if (!trimmedQuery) return
							if (trimmedQuery === requestedQuery) return
							setRequestedQuery(trimmedQuery)
							if (trimmedQuery === loaderData.q) return
							void load(`/search?q=${encodeURIComponent(trimmedQuery)}`)
						}}
					>
						<div className="relative">
							<Input
								ref={inputRef}
								type="search"
								name="q"
								value={query}
								placeholder="Search..."
								className={inputClassName}
								onChange={(event) => setQuery(event.currentTarget.value)}
							/>
						</div>
					</fetcher.Form>
				}
			/>

			<Grid as="main">
				<Spacer size="2xs" className="col-span-full" />

				{error ? (
					<div className="col-span-full">
						<ErrorPanel>{error}</ErrorPanel>
					</div>
				) : null}

				{trimmedQuery ? (
					<div className="col-span-full">
						<H3>Results</H3>
						<H4 as="p" variant="secondary">{`For: "${trimmedQuery}"`}</H4>
					</div>
				) : (
					<div className="col-span-full">
						<Paragraph textColorClassName="text-secondary">
							{`Try a query like "react testing library", "call kent authentication", or "youtube closure".`}
						</Paragraph>
					</div>
				)}

				<Spacer size="3xs" className="col-span-full" />

				<div className="col-span-full">
					{showResultsSection ? (
						<>
							{resolved ? (
								<div className={resultsContainerClassName}>
									<SearchResults
										q={resolved.q}
										results={resolved.results}
										lowRankingResults={resolved.lowRankingResults}
										noCloseMatches={resolved.noCloseMatches}
									/>
								</div>
							) : null}
							{activeData && shouldAwaitResults && searchPayloadPromise ? (
								<Suspense
									fallback={resolved ? null : <SearchResultsFallback />}
								>
									<Await
										resolve={searchPayloadPromise}
										errorElement={<SearchResultsError />}
									>
										{(payload) => (
											<ResolveResults
												q={requestedQuery}
												results={payload.results}
												lowRankingResults={payload.lowRankingResults}
												noCloseMatches={payload.noCloseMatches}
												setResolved={setResolved}
												renderResults={!resolved}
												resultsContainerClassName={resultsContainerClassName}
											/>
										)}
									</Await>
								</Suspense>
							) : !resolved ? (
								<SearchResultsFallback />
							) : null}
						</>
					) : null}
				</div>
			</Grid>
		</div>
	)
}

function ResolveResults({
	q,
	results,
	lowRankingResults,
	noCloseMatches,
	setResolved,
	renderResults,
	resultsContainerClassName,
}: {
	q: string
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
	setResolved: React.Dispatch<
		React.SetStateAction<{
			q: string
			results: Array<SearchResult>
			lowRankingResults: Array<SearchResult>
			noCloseMatches: boolean
		} | null>
	>
	renderResults: boolean
	resultsContainerClassName: string
}) {
	React.useEffect(() => {
		setResolved({ q, results, lowRankingResults, noCloseMatches })
	}, [q, results, lowRankingResults, noCloseMatches, setResolved])

	if (!renderResults) return null

	return (
		<div className={resultsContainerClassName}>
			<SearchResults
				q={q}
				results={results}
				lowRankingResults={lowRankingResults}
				noCloseMatches={noCloseMatches}
			/>
		</div>
	)
}

function SearchResultsFallback() {
	return (
		<div className="space-y-4">
			<Paragraph textColorClassName="text-secondary">{`Searching...`}</Paragraph>
			<ul className="space-y-6">
				{Array.from({ length: 3 }).map((_, i) => (
					<li key={i} className="rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
						<div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
						<div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
					</li>
				))}
			</ul>
		</div>
	)
}

function SearchHitRow({ r }: { r: SearchResult }) {
	const href = r.url ?? (r.id ? `/` : '#')
	const linkTo =
		r.type === 'youtube' &&
		typeof href === 'string' &&
		href.startsWith('/youtube')
			? (() => {
					try {
						const u = new URL(href, 'https://kentcdodds.com')
						if (r.title) u.searchParams.set('title', r.title)
						const desc = r.summary ?? r.snippet
						if (desc) {
							u.searchParams.set(
								'desc',
								desc.length > 400 ? `${desc.slice(0, 397)}...` : desc,
							)
						}
						return `${u.pathname}?${u.searchParams.toString()}`
					} catch {
						return href
					}
				})()
			: href
	const semanticSearchState =
		r.type === 'youtube'
			? {
					semanticSearch: {
						title: r.title ?? null,
						description: r.summary ?? r.snippet ?? null,
					},
				}
			: undefined
	const title = href ? (
		<Link to={linkTo} state={semanticSearchState}>
			{r.title ?? r.url ?? r.id}
		</Link>
	) : (
		r.id
	)
	const showScore = typeof r.score === 'number' && Number.isFinite(r.score)
	return (
		<li className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg bg-gray-100 p-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:p-6 md:grid-cols-[4rem_minmax(0,1fr)] md:gap-y-1 dark:bg-gray-800">
			{showScore ? (
				<span
					className="absolute top-3 right-3 font-mono text-[0.65rem] leading-none text-slate-400 tabular-nums sm:top-4 sm:right-4 dark:text-slate-500"
					title="Fused search relevance score"
				>
					{r.score.toFixed(4)}
				</span>
			) : null}
			<H4
				className={`col-span-2 min-w-0 leading-snug text-balance wrap-anywhere md:col-span-1 md:col-start-2 md:row-start-1 md:line-clamp-3 md:leading-tight ${showScore ? 'pr-14 sm:pr-16' : ''}`}
			>
				{title}
			</H4>
			<div className="row-start-2 self-start md:row-span-3 md:row-start-1 md:self-start">
				{r.imageUrl ? (
					<img
						src={r.imageUrl}
						alt={r.imageAlt ?? ''}
						className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16"
						loading="lazy"
					/>
				) : (
					<div className="h-14 w-14 rounded-lg bg-gray-200 sm:h-16 sm:w-16 dark:bg-gray-700" />
				)}
			</div>
			<div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-500 md:row-start-2">
				{r.type ? <span>{r.type}</span> : null}
				{r.url ? (
					<span className="max-w-full break-all text-slate-500">{r.url}</span>
				) : null}
			</div>
			{r.summary || r.snippet ? (
				<p className="col-span-2 mt-1 line-clamp-3 text-base text-slate-600 md:col-span-1 md:col-start-2 md:row-start-3 md:mt-0 dark:text-slate-400">
					{r.summary ?? r.snippet}
				</p>
			) : null}
		</li>
	)
}

function SearchResults({
	q,
	results,
	lowRankingResults,
	noCloseMatches,
}: {
	q: string
	results: Array<SearchResult>
	lowRankingResults: Array<SearchResult>
	noCloseMatches: boolean
}) {
	const [showLowRanking, setShowLowRanking] = React.useState(false)
	React.useEffect(() => {
		setShowLowRanking(false)
	}, [q])

	const hasLowRanking = lowRankingResults.length > 0

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<Paragraph textColorClassName="text-secondary">
					{results.length === 1 ? '1 result' : `${results.length} results`}
				</Paragraph>
				<Paragraph textColorClassName="text-secondary">{`Query: "${q}"`}</Paragraph>
			</div>
			{results.length ? (
				<ul className="space-y-6">
					{results.map((r) => (
						<SearchHitRow key={r.id} r={r} />
					))}
				</ul>
			) : noCloseMatches ? (
				<div className="space-y-2">
					<Paragraph textColorClassName="text-secondary">
						{`No close matches for this query. The index had related candidates, but none met the confidence threshold.`}
					</Paragraph>
					<Paragraph textColorClassName="text-secondary">
						{`Try different keywords, a shorter phrase, or check spelling.`}
					</Paragraph>
				</div>
			) : (
				<Paragraph textColorClassName="text-secondary">{`No matches found.`}</Paragraph>
			)}
			{hasLowRanking ? (
				<div className="border-secondary border-t border-dashed pt-4">
					<Button
						type="button"
						variant="secondary"
						size="small"
						onClick={() => setShowLowRanking((v) => !v)}
						aria-expanded={showLowRanking}
					>
						{showLowRanking
							? 'Hide low ranking results'
							: `Show low ranking results (${lowRankingResults.length})`}
					</Button>
					{showLowRanking ? (
						<div className="mt-4 space-y-3">
							<H4 as="p" variant="secondary">
								Lower-confidence matches
							</H4>
							<Paragraph
								textColorClassName="text-secondary"
								className="text-sm"
							>
								These pages scored below the main results threshold or beyond
								the top slice. They may still be useful.
							</Paragraph>
							<ul className="space-y-6">
								{lowRankingResults.map((r) => (
									<SearchHitRow key={`low-${r.id}`} r={r} />
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	)
}

function SearchResultsError() {
	const error = useAsyncError()
	return (
		<ErrorPanel>
			<div>Whoops! Sorry, there was an error 😬</div>
			<hr className="my-2" />
			<pre className="whitespace-pre-wrap">{getErrorMessage(error)}</pre>
		</ErrorPanel>
	)
}
