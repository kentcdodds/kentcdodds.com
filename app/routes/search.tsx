import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, Link, useLoaderData } from '@remix-run/react'
import * as React from 'react'
import { ErrorPanel, Input, inputClassName } from '#app/components/form-elements.tsx'
import { Grid } from '#app/components/grid.tsx'
import { HeroSection } from '#app/components/sections/hero-section.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { H3, H4, Paragraph } from '#app/components/typography.tsx'
import { images } from '#app/images.tsx'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
	type SemanticSearchResult,
} from '#app/utils/semantic-search.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const q = (url.searchParams.get('q') ?? '').trim()

	if (!q) {
		return json(
			{
				q: '',
				configured: isSemanticSearchConfigured(),
				results: [] as Array<SemanticSearchResult>,
				error: undefined as string | undefined,
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		)
	}

	if (!isSemanticSearchConfigured()) {
		return json(
			{
				q,
				configured: false,
				results: [] as Array<SemanticSearchResult>,
				error:
					'Semantic search is not configured on this environment yet. Try again later.',
			},
			{ headers: { 'Cache-Control': 'no-store' } },
		)
	}

	let results: Array<SemanticSearchResult> = []
	let error: string | undefined
	try {
		results = await semanticSearchKCD({ query: q, topK: 20 })
	} catch (e) {
		console.error(e)
		error =
			e instanceof Error
				? e.message
				: 'Something went wrong while searching. Please try again.'
	}

	return json(
		{ q, configured: true, results, error },
		{ headers: { 'Cache-Control': 'no-store' } },
	)
}

export default function SearchPage() {
	const data = useLoaderData<typeof loader>()
	const inputRef = React.useRef<HTMLInputElement>(null)
	return (
		<div>
			<HeroSection
				title="Search"
				subtitle="Semantic search across posts, pages, and podcasts."
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
						<H3>{data.results.length} Results</H3>
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
					{data.results.length ? (
						<ul className="space-y-6">
							{data.results.map((r) => {
								const href = r.url ?? (r.id ? `/` : '#')
								return (
									<li key={r.id} className="rounded-lg bg-gray-100 p-6 dark:bg-gray-800">
										<div className="flex items-baseline justify-between gap-4">
											<div className="min-w-0">
												<H4 className="truncate">
													{href ? <Link to={href}>{r.title ?? r.url ?? r.id}</Link> : r.id}
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
					) : data.q ? (
						<Paragraph textColorClassName="text-secondary">{`No matches found.`}</Paragraph>
					) : null}
				</div>
			</Grid>
		</div>
	)
}

