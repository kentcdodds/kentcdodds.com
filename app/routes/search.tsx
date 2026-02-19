import { type LoaderFunctionArgs, defer } from '@remix-run/node'
import {
	Await,
	Link,
	useAsyncError,
	useFetcher,
	useLoaderData,
} from '@remix-run/react'
import React, { Suspense } from 'react'
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
} from '#app/utils/misc.tsx'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
	type SemanticSearchResult,
} from '#app/utils/semantic-search.server.ts'

const semanticSearchNotConfiguredMessage =
	'Semantic search is not configured on this environment yet. Try again later.'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const q = (url.searchParams.get('q') ?? '').trim()
	const configured = isSemanticSearchConfigured()
	const headers = { 'Cache-Control': 'no-store' }

	if (!q) {
		return defer(
			{
				q: '',
				configured,
				results: [] as Array<SemanticSearchResult>,
				error: undefined as string | undefined,
			},
			{ headers },
		)
	}

	if (!configured) {
		return defer(
			{
				q,
				configured: false,
				results: [] as Array<SemanticSearchResult>,
				error:
					semanticSearchNotConfiguredMessage,
			},
			{ headers },
		)
	}

	const resultsPromise = semanticSearchKCD({ query: q, topK: 20 }).catch(
		(e) => {
			console.error(e)
			throw e
		},
	)
	return defer(
		{
			q,
			configured: true,
			results: resultsPromise,
			error: undefined as string | undefined,
		},
		{ headers },
	)
}

export default function SearchPage() {
	const loaderData = useLoaderData<typeof loader>()
	const fetcher = useFetcher<typeof loader>({ key: 'search-page-results' })
	const { load } = fetcher
	const inputRef = React.useRef<HTMLInputElement>(null)

	const [query, setQuery] = React.useState(loaderData.q)
	const trimmedQuery = query.trim()

	// Keep the URL shareable without triggering loader navigations on each keypress.
	useUpdateQueryStringValueWithoutNavigation('q', trimmedQuery)

	const [requestedQuery, setRequestedQuery] = React.useState(trimmedQuery)

	type Resolved = { q: string; results: Array<SemanticSearchResult> }
	const [resolved, setResolved] = React.useState<Resolved | null>(null)

	const expectedQueryRef = React.useRef(requestedQuery)
	React.useEffect(() => {
		expectedQueryRef.current = requestedQuery
	}, [requestedQuery])
	const getExpectedQuery = React.useCallback(
		() => expectedQueryRef.current,
		[],
	)

	React.useEffect(() => {
		setQuery(loaderData.q)
		setRequestedQuery(loaderData.q)
	}, [loaderData.q])

	React.useEffect(() => {
		if (!trimmedQuery) {
			setResolved(null)
			setRequestedQuery('')
		}
	}, [trimmedQuery])

	const debouncedRequestSearch = useDebounce((nextQuery: string) => {
		setRequestedQuery(nextQuery)
		if (!loaderData.configured) return
		if (!nextQuery) return
		// If the loader already fetched this query (e.g. initial page load), reuse it.
		if (nextQuery === loaderData.q) return
		load(`/search?q=${encodeURIComponent(nextQuery)}`)
	}, 250)

	React.useEffect(() => {
		// Clear results immediately when the input is cleared.
		debouncedRequestSearch(trimmedQuery)
	}, [debouncedRequestSearch, trimmedQuery])

	const isQueryPending = trimmedQuery !== requestedQuery

	const activeData =
		requestedQuery && loaderData.q === requestedQuery
			? loaderData
			: fetcher.data?.q === requestedQuery
				? fetcher.data
				: null

	const error =
		!loaderData.configured && trimmedQuery
			? semanticSearchNotConfiguredMessage
			: activeData?.error

	const showResultsSection = trimmedQuery && loaderData.configured && !error
	const isPending =
		Boolean(showResultsSection) &&
		(isQueryPending || (resolved ? resolved.q !== requestedQuery : false))
	const resultsContainerClassName = isPending
		? 'transition-opacity opacity-60'
		: 'transition-opacity'
	const shouldAwaitResults =
		Boolean(showResultsSection) && Boolean(activeData) && resolved?.q !== requestedQuery

	return (
		<div>
			<HeroSection
				title="Search"
				subtitle="Semantic search across posts, pages, podcasts, talks, resume, credits, and testimonials."
				imageBuilder={images.kodyProfileGray}
				action={
					<fetcher.Form method="get" action="/search" className="w-full">
						<div className="relative">
							<Input
								ref={inputRef}
								type="search"
								name="q"
								value={query}
								placeholder="Semantic search..."
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
							{`Try a query like "react testing library" or "call kent authentication".`}
						</Paragraph>
					</div>
				)}

				<Spacer size="3xs" className="col-span-full" />

				<div className="col-span-full">
					{showResultsSection ? (
						<>
							{resolved ? (
								<div className={resultsContainerClassName}>
									<SearchResults q={resolved.q} results={resolved.results} />
								</div>
							) : null}
							{activeData && shouldAwaitResults ? (
								<Suspense fallback={resolved ? null : <SearchResultsFallback />}>
									<Await
										resolve={activeData.results}
										errorElement={<SearchResultsError />}
									>
										{(results) => (
											<ResolveResults
												q={requestedQuery}
												results={results}
												setResolved={setResolved}
												getExpectedQuery={getExpectedQuery}
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
	setResolved,
	getExpectedQuery,
	renderResults,
	resultsContainerClassName,
}: {
	q: string
	results: Array<SemanticSearchResult>
	setResolved: React.Dispatch<
		React.SetStateAction<
			| { q: string; results: Array<SemanticSearchResult> }
			| null
		>
	>
	getExpectedQuery: () => string
	renderResults: boolean
	resultsContainerClassName: string
}) {
	React.useEffect(() => {
		if (getExpectedQuery() !== q) return
		setResolved({ q, results })
	}, [getExpectedQuery, q, results, setResolved])

	if (!renderResults) return null

	return (
		<div className={resultsContainerClassName}>
			<SearchResults q={q} results={results} />
		</div>
	)
}

function SearchResultsFallback() {
	return (
		<div className="space-y-4">
			<Paragraph textColorClassName="text-secondary">{`Searching...`}</Paragraph>
			<ul className="space-y-6">
				{Array.from({ length: 3 }).map((_, i) => (
					<li
						key={i}
						className="rounded-lg bg-gray-100 p-6 dark:bg-gray-800"
					>
						<div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
						<div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
					</li>
				))}
			</ul>
		</div>
	)
}

function SearchResults({
	q,
	results,
}: {
	q: string
	results: Array<SemanticSearchResult>
}) {
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
					{results.map((r) => {
						const href = r.url ?? (r.id ? `/` : '#')
						return (
							<li
								key={r.id}
								className="rounded-lg bg-gray-100 p-6 dark:bg-gray-800"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex min-w-0 flex-1 items-start gap-4">
										<div className="shrink-0">
											{r.imageUrl ? (
												<img
													src={r.imageUrl}
													alt={r.imageAlt ?? ''}
													className="h-16 w-16 rounded-lg object-cover"
													loading="lazy"
												/>
											) : (
												<div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<H4 className="truncate">
												{href ? (
													<Link to={href}>{r.title ?? r.url ?? r.id}</Link>
												) : (
													r.id
												)}
											</H4>
											<div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-500">
												{r.type ? <span>{r.type}</span> : null}
												{r.url ? <span className="truncate">{r.url}</span> : null}
											</div>
											{r.summary || r.snippet ? (
												<p className="mt-3 line-clamp-3 text-base text-slate-600 dark:text-slate-400">
													{r.summary ?? r.snippet}
												</p>
											) : null}
										</div>
									</div>
									<p className="shrink-0 text-sm text-slate-500">
										{Number.isFinite(r.score) ? r.score.toFixed(3) : ''}
									</p>
								</div>
							</li>
						)
					})}
				</ul>
			) : (
				<Paragraph textColorClassName="text-secondary">{`No matches found.`}</Paragraph>
			)}
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
