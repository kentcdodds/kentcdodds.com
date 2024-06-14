import { type HeadersFunction, type MetaFunction } from '@remix-run/node'
import { useSearchParams } from '@remix-run/react'
import * as React from 'react'
import {
	useWorkshopsData,
	type loader as WorkshopLoader,
	type LoaderData as WorkshopLoaderData,
} from './_workshops.tsx'
import { Grid } from '~/components/grid.tsx'
import { CourseSection } from '~/components/sections/course-section.tsx'
import { HeroSection } from '~/components/sections/hero-section.tsx'
import { Spacer } from '~/components/spacer.tsx'
import { Tag } from '~/components/tag.tsx'
import { H3, H6 } from '~/components/typography.tsx'
import { WorkshopCard } from '~/components/workshop-card.tsx'
import { RegistrationPanel } from '~/components/workshop-registration-panel.tsx'
import { getSocialImageWithPreTitle, images } from '~/images.tsx'
import {
	type RootLoaderType,
	type LoaderData as RootLoaderData,
} from '~/root.tsx'
import { type Workshop } from '~/types.ts'
import {
	getDisplayUrl,
	getUrl,
	listify,
	typedBoolean,
	useUpdateQueryStringValueWithoutNavigation,
} from '~/utils/misc.tsx'
import { getSocialMetas } from '~/utils/seo.ts'
import { type WorkshopEvent } from '~/utils/workshop-tickets.server.ts'

export const meta: MetaFunction<
	{},
	{
		root: RootLoaderType
		'routes/workshops+/_workshops': typeof WorkshopLoader
	}
> = ({ matches }) => {
	const { requestInfo } = matches.find((m) => m.id === 'root')
		?.data as RootLoaderData
	const data = matches.find((m) => m.id === 'routes/workshops+/_workshops')
		?.data as WorkshopLoaderData

	const tagsSet = new Set<string>()
	for (const workshop of data.workshops) {
		for (const category of workshop.categories) {
			tagsSet.add(category)
		}
	}

	return getSocialMetas({
		title: 'Workshops with Kent C. Dodds',
		description: `Get really good at making software with Kent C. Dodds' ${
			data.workshops.length
		} workshops on ${listify([...tagsSet])}`,
		keywords: Array.from(tagsSet).join(', '),
		url: getUrl(requestInfo),
		image: getSocialImageWithPreTitle({
			url: getDisplayUrl(requestInfo),
			featuredImage: 'kent/kent-workshopping-at-underbelly',
			preTitle: 'Check out these workshops',
			title: `Live and remote React, TypeScript, and Testing workshops with instructor Kent C. Dodds`,
		}),
	})
}

export const headers: HeadersFunction = ({ parentHeaders }) => parentHeaders

function WorkshopsHome() {
	const data = useWorkshopsData()

	const tagsSet = new Set<string>()
	for (const workshop of data.workshops) {
		for (const category of workshop.categories) {
			tagsSet.add(category)
		}
	}

	// this bit is very similar to what's on the blogs page.
	// Next time we need to do work in here, let's make an abstraction for them
	const tags = Array.from(tagsSet)
	const [searchParams] = useSearchParams()

	const [queryValue, setQuery] = React.useState<string>(() => {
		return searchParams.get('q') ?? ''
	})
	const workshops = queryValue
		? data.workshops.filter((workshop) =>
				queryValue.split(' ').every((tag) => workshop.categories.includes(tag)),
			)
		: data.workshops

	const visibleTags = queryValue
		? new Set(
				workshops.flatMap((workshop) => workshop.categories).filter(Boolean),
			)
		: new Set(tags)

	function toggleTag(tag: string) {
		setQuery((q) => {
			// create a regexp so that we can replace multiple occurrences (`react node react`)
			const expression = new RegExp(tag, 'ig')

			const newQuery = expression.test(q)
				? q.replace(expression, '')
				: `${q} ${tag}`

			// trim and remove subsequent spaces (`react   node ` => `react node`)
			return newQuery.replace(/\s+/g, ' ').trim()
		})
	}

	useUpdateQueryStringValueWithoutNavigation('q', queryValue)

	const workshopEvents: Array<Workshop['events'][number] | WorkshopEvent> = [
		...workshops.flatMap((w) => w.events),
		...data.workshopEvents,
	].filter(typedBoolean)

	return (
		<>
			<HeroSection
				title="Check out these remote workshops."
				subtitle="See our upcoming events below."
				imageBuilder={images.teslaY}
				imageSize="large"
			/>

			{workshopEvents.length ? (
				<Grid>
					<H3 className="col-span-full">Currently Scheduled Workshops</H3>
					<div className="col-span-full mt-6">
						{workshopEvents.map((workshopEvent, index) => (
							<React.Fragment key={index}>
								<RegistrationPanel workshopEvent={workshopEvent} />
								{index === workshopEvents.length - 1 ? null : (
									<Spacer size="2xs" />
								)}
							</React.Fragment>
						))}
					</div>
				</Grid>
			) : null}

			<Spacer size="base" />

			<Grid className="mb-14">
				<div className="col-span-full flex flex-wrap gap-4 lg:col-span-10">
					{tags.map((tag) => (
						<Tag
							key={tag}
							tag={tag}
							selected={queryValue.includes(tag)}
							onClick={() => toggleTag(tag)}
							disabled={Boolean(
								!visibleTags.has(tag) && !queryValue.includes(tag),
							)}
						/>
					))}
				</div>
			</Grid>

			<Grid className="mb-64">
				<H6 as="h2" className="col-span-full mb-6">
					{queryValue
						? workshops.length === 1
							? `1 workshop found`
							: `${workshops.length} workshops found`
						: 'Showing all workshops'}
				</H6>

				<div className="col-span-full">
					<Grid nested rowGap>
						{workshops
							.sort((a, z) =>
								workshopHasEvents(a, data.workshopEvents)
									? workshopHasEvents(z, data.workshopEvents)
										? 0
										: -1
									: 1,
							)
							.map((workshop, idx) => (
								<div key={idx} className="col-span-full md:col-span-4">
									<WorkshopCard
										workshop={workshop}
										titoEvents={data.workshopEvents.filter(
											(e) => e.metadata.workshopSlug === workshop.slug,
										)}
									/>
								</div>
							))}
					</Grid>
				</div>
			</Grid>

			<CourseSection />
		</>
	)
}

function workshopHasEvents(
	workshop: Workshop,
	titoEvents: Array<WorkshopEvent>,
) {
	return Boolean(
		workshop.events.length ||
			titoEvents.filter((e) => e.metadata.workshopSlug === workshop.slug)
				.length,
	)
}

export default WorkshopsHome
