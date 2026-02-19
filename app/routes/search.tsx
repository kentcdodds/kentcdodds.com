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
	const inputRef = React.useRef<HTMLInputElement>(null)

	const [query, setQuery] = React.useState(loaderData.q)
	const trimmedQuery = query.trim()

	// Keep the URL shareable without triggering loader navigations on each keypress.
	useUpdateQueryStringValueWithoutNavigation('q', trimmedQuery)

	// Track what we are actually searching for (debounced) so we can avoid showing
	// stale results for a newer input value.
	const [debouncedQuery, setDebouncedQuery] = React.useState(trimmedQuery)
	const setDebouncedQueryDeferred = useDebounce((next: string) => {
		setDebouncedQuery(next)
	}, 250)

	React.useEffect(() => {
		setQuery(loaderData.q)
		setDebouncedQuery(loaderData.q)
	}, [loaderData.q])

	React.useEffect(() => {
		if (trimmedQuery === debouncedQuery) return
		// Clear results immediately when the input is cleared.
		if (!trimmedQuery) {
			setDebouncedQuery('')
			return
		}
		setDebouncedQueryDeferred(trimmedQuery)
	}, [debouncedQuery, setDebouncedQueryDeferred, trimmedQuery])

	React.useEffect(() => {
		if (!loaderData.configured) return
		if (!debouncedQuery) return
		// If the loader already fetched this query (e.g. initial page load), reuse it.
		if (debouncedQuery === loaderData.q) return
		fetcher.load(`/search?q=${encodeURIComponent(debouncedQuery)}`)
	}, [debouncedQuery, fetcher, loaderData.configured, loaderData.q])

	const isQueryPending = trimmedQuery !== debouncedQuery
	const isFetchingResults = fetcher.state !== 'idle'

	const activeData =
		debouncedQuery && fetcher.data?.q === debouncedQuery
			? fetcher.data
			: loaderData.q === debouncedQuery
				? loaderData
				: null

	const error =
		!loaderData.configured && trimmedQuery
			? semanticSearchNotConfiguredMessage
			: activeData?.error

	return (
		<div>
			<HeroSection
				title="Search"
				subtitle="Semantic search across posts, pages, podcasts, talks, resume, credits, and testimonials."
				imageBuilder={images.kodyProfileGray}
				action={
					<div className="w-full">
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
					</div>
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
					{trimmedQuery && loaderData.configured && !error ? (
						isQueryPending || isFetchingResults ? (
							<SearchResultsFallback />
						) : activeData ? (
							<Suspense fallback={<SearchResultsFallback />}>
								<Await
									resolve={activeData.results}
									errorElement={<SearchResultsError />}
								>
									{(results) => (
										<SearchResults q={debouncedQuery} results={results} />
									)}
								</Await>
							</Suspense>
						) : (
							<SearchResultsFallback />
						)
					) : null}
				</div>
			</Grid>
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
