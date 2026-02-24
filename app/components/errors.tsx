import { clsx } from 'clsx'
import errorStack from 'error-stack-parser'
import * as React from 'react'
import { useMatches } from 'react-router'
import { type MdxListItem } from '#app/types.ts'
import { getErrorMessage } from '#app/utils/misc.ts'
import {
	type NotFoundMatch,
	sortNotFoundMatches,
} from '#app/utils/not-found-matches.ts'
import { notFoundQueryFromPathname } from '#app/utils/not-found-query.ts'
import { ArrowLink } from './arrow-button.tsx'
import { Grid } from './grid.tsx'
import { Facepalm, Grimmacing, MissingSomething } from './kifs.tsx'
import { BlogSection } from './sections/blog-section.tsx'
import { HeaderSection } from './sections/header-section.tsx'
import { HeroSection, type HeroSectionProps } from './sections/hero-section.tsx'
import { Spacer } from './spacer.tsx'
import { H2, H4, H6 } from './typography.tsx'

function RedBox({ error }: { error: Error }) {
	const [isVisible, setIsVisible] = React.useState(true)
	const frames = errorStack.parse(error)

	return (
		<div
			className={clsx(
				'fixed inset-0 z-10 flex items-center justify-center transition',
				{
					'pointer-events-none opacity-0': !isVisible,
				},
			)}
		>
			<button
				className="absolute inset-0 block h-full w-full bg-black opacity-75"
				onClick={() => setIsVisible(false)}
			/>
			<div className="border-lg text-primary mx-5vw relative my-16 max-h-[75vh] overflow-y-auto rounded-lg bg-red-500 p-12">
				<H2>{error.message}</H2>
				<div>
					{frames.map((frame) => (
						<div
							key={[frame.fileName, frame.lineNumber, frame.columnNumber].join(
								'-',
							)}
							className="pt-4"
						>
							<H6 as="div" className="pt-2">
								{frame.functionName}
							</H6>
							<div className="font-mono opacity-75">
								{frame.fileName}:{frame.lineNumber}:{frame.columnNumber}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function ErrorPage({
	error,
	articles,
	possibleMatches,
	possibleMatchesQuery,
	heroProps,
}: {
	error?: Error
	articles?: Array<MdxListItem>
	possibleMatches?: Array<NotFoundMatch>
	possibleMatchesQuery?: string
	heroProps: HeroSectionProps
}) {
	// Only inject the "arrow down" helper link when the caller didn't provide an
	// explicit action. Otherwise, it can create duplicate CTAs (notably on 404s).
	const resolvedHeroProps: HeroSectionProps = heroProps.action
		? heroProps
		: possibleMatches?.length
			? {
					...heroProps,
					arrowUrl: '#possible-matches',
					arrowLabel: 'Possible matches',
				}
			: articles?.length
				? {
						...heroProps,
						arrowUrl: '#articles',
						arrowLabel: 'But wait, there is more!',
					}
				: heroProps
	return (
		<>
			<noscript>
				<div
					style={{
						backgroundColor: 'black',
						color: 'white',
						padding: 30,
					}}
				>
					<h1 style={{ fontSize: '2em' }}>{heroProps.title}</h1>
					<p style={{ fontSize: '1.5em' }}>{heroProps.subtitle}</p>
					<small>
						Also, this site works much better with JavaScript enabled...
					</small>
				</div>
			</noscript>
			<main className="relative">
				{error && import.meta.env.MODE === 'development' ? (
					<RedBox error={error} />
				) : null}
				<HeroSection {...resolvedHeroProps} />

				{possibleMatches?.length ? (
					<PossibleMatchesSection
						matches={possibleMatches}
						query={possibleMatchesQuery}
					/>
				) : null}

				{articles?.length ? (
					<>
						{possibleMatches?.length === 0 ? <Spacer size="lg" /> : null}
						<div id="articles" />
						<BlogSection
							articles={articles}
							title="Looking for something to read?"
							description="Have a look at these articles."
						/>
					</>
				) : null}
			</main>
		</>
	)
}

function PossibleMatchesSection({
	matches,
	query,
}: {
	matches: Array<NotFoundMatch>
	query?: string
}) {
	const q = typeof query === 'string' ? query.trim() : ''
	const sorted = sortNotFoundMatches(matches)

	return (
		<>
			<div id="possible-matches" />
			<HeaderSection
				title="Possible matches"
				subTitle={q ? `Closest matches for "${q}"` : 'Closest matches.'}
			/>
			<Spacer size="2xs" />
			<Grid>
				<div className="col-span-full lg:col-span-8 lg:col-start-3">
					<ul className="space-y-6">
						{sorted.slice(0, 8).map((m) => (
							<li
								key={`${m.type}:${m.url}`}
								className="rounded-lg bg-gray-100 p-4 sm:p-6 dark:bg-gray-800"
							>
								<div className="flex items-start gap-3 sm:gap-4">
									<div className="shrink-0">
										{m.imageUrl ? (
											<img
												src={m.imageUrl}
												alt={m.imageAlt ?? ''}
												className="h-12 w-12 rounded-lg object-cover sm:h-16 sm:w-16"
												loading="lazy"
											/>
										) : (
											<div className="h-12 w-12 rounded-lg bg-gray-200 sm:h-16 sm:w-16 dark:bg-gray-700" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<H4 className="truncate">
											<a href={m.url} className="hover:underline">
												{m.title}
											</a>
										</H4>
										<div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-500">
											<span>{m.type}</span>
											<span className="truncate">{m.url}</span>
										</div>
										{m.summary ? (
											<p className="mt-2 line-clamp-3 text-base text-slate-600 sm:mt-3 dark:text-slate-400">
												{m.summary}
											</p>
										) : null}
									</div>
								</div>
							</li>
						))}
					</ul>
				</div>
			</Grid>
		</>
	)
}

function FourOhFour({
	articles,
	possibleMatches: possibleMatchesProp,
	possibleMatchesQuery,
	pathname: pathnameProp,
}: {
	articles?: Array<MdxListItem>
	possibleMatches?: Array<NotFoundMatch>
	possibleMatchesQuery?: string
	pathname?: string
}) {
	const routeMatches = useMatches()
	const last = routeMatches[routeMatches.length - 1]
	const pathname =
		typeof pathnameProp === 'string' ? pathnameProp : last?.pathname
	const derivedQuery = notFoundQueryFromPathname(pathname ?? '/')
	const effectiveQuery =
		typeof possibleMatchesQuery === 'string' && possibleMatchesQuery.trim()
			? possibleMatchesQuery.trim()
			: derivedQuery

	const q = effectiveQuery ? effectiveQuery.trim() : ''
	const searchUrl = q ? `/search?q=${encodeURIComponent(q)}` : '/search'
	const hasPossibleMatches =
		Array.isArray(possibleMatchesProp) && possibleMatchesProp.length > 0
	const heroActionTo = hasPossibleMatches ? '#possible-matches' : searchUrl
	const heroActionLabel = hasPossibleMatches
		? 'Possible matches'
		: 'Search the site'

	// Most pages intentionally use the global `mx-10vw` gutter (it’s part of the
	// overall site layout). The 404 view reads better on mobile when it’s a bit
	// wider, so we override the underlying spacing token for just this subtree.
	const notFoundGutterStyle = {
		['--spacing-10vw' as any]: 'clamp(0.75rem, 3vw, 3rem)',
	} as React.CSSProperties

	return (
		<div style={notFoundGutterStyle}>
			<ErrorPage
				articles={articles}
				possibleMatches={possibleMatchesProp}
				possibleMatchesQuery={effectiveQuery}
				heroProps={{
					title: "404 - Oh no, you found a page that's missing stuff.",
					subtitle: `"${pathname}" is not a page on kentcdodds.com. So sorry.`,
					image: <MissingSomething className="rounded-lg" aspectRatio="3:4" />,
					action: (
						<ArrowLink to={heroActionTo} className="whitespace-nowrap">
							{heroActionLabel}
						</ArrowLink>
					),
				}}
			/>
		</div>
	)
}

export function FourHundred({ error }: { error?: unknown }) {
	return (
		<ErrorPage
			heroProps={{
				title: '400 - Oh no, you did something wrong.',
				subtitle: getErrorMessage(
					error,
					`If you think I made a mistake, let me know...`,
				),
				image: <Facepalm className="rounded-lg" aspectRatio="3:4" />,
				action: <ArrowLink href="/">Go home</ArrowLink>,
			}}
		/>
	)
}

function ServerError({
	error,
	articles,
}: {
	error?: Error
	articles?: Array<MdxListItem>
}) {
	const matches = useMatches()
	const last = matches[matches.length - 1]
	const pathname = last?.pathname

	return (
		<ErrorPage
			error={error}
			articles={articles}
			heroProps={{
				title: '500 - Oh no, something did not go well.',
				subtitle: `"${pathname}" is currently not working. So sorry.`,
				image: <Grimmacing className="rounded-lg" aspectRatio="3:4" />,
				action: <ArrowLink href="/">Go home</ArrowLink>,
			}}
		/>
	)
}

export { ErrorPage, ServerError, FourOhFour }
