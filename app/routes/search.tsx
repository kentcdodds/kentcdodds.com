import { type LoaderFunctionArgs, defer } from '@remix-run/node'
import {
	Await,
	Form,
	Link,
	useAsyncError,
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
import { getErrorMessage } from '#app/utils/misc.tsx'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
	type SemanticSearchResult,
} from '#app/utils/semantic-search.server.ts'

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
					'Semantic search is not configured on this environment yet. Try again later.',
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
	const data = useLoaderData<typeof loader>()
	const inputRef = React.useRef<HTMLInputElement>(null)
	return (
		<div>
			<HeroSection
				title="Search"
				subtitle="Semantic search across posts, pages, podcasts, talks, resume, credits, and testimonials."
				imageBuilder={images.kodyProfileGray}
				action={
					<Form method="get" action="/search" className="w-full">
						<div className="relative">
							<Input
								ref={inputRef}
								type="search"
								name="q"
								defaultValue={data.q}
								placeholder="Search anything…"
								className={inputClassName}
							/>
						</div>
					</Form>
				}
			/>

			<Grid as="main">
				<Spacer size="2xs" className="col-span-full" />

				{data.error ? (
					<div className="col-span-full">
						<ErrorPanel>{data.error}</ErrorPanel>
					</div>
				) : null}

				{data.q ? (
					<div className="col-span-full">
						<H3>Results</H3>
						<H4 as="p" variant="secondary">{`For: "${data.q}"`}</H4>
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
					{data.q && data.configured && !data.error ? (
						<Suspense
							fallback={
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
							}
						>
							<Await
								resolve={data.results}
								errorElement={<SearchResultsError />}
							>
								{(results) => <SearchResults q={data.q} results={results} />}
							</Await>
						</Suspense>
					) : data.q && !data.error ? (
						<Paragraph textColorClassName="text-secondary">{`No matches found.`}</Paragraph>
					) : null}
				</div>
			</Grid>
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
								<div className="flex items-baseline justify-between gap-4">
									<div className="min-w-0">
										<H4 className="truncate">
											{href ? (
												<Link to={href}>{r.title ?? r.url ?? r.id}</Link>
											) : (
												r.id
											)}
										</H4>
										{r.type ? (
											<p className="text-sm text-slate-500">{r.type}</p>
										) : null}
									</div>
									<p className="shrink-0 text-sm text-slate-500">
										{Number.isFinite(r.score) ? r.score.toFixed(3) : ''}
									</p>
								</div>
								{r.snippet ? (
									<p className="mt-3 text-base text-slate-600 dark:text-slate-400">
										{r.snippet}
									</p>
								) : null}
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
