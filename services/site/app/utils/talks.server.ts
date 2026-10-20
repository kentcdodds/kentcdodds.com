import {
	slugifyWithCounter,
	type CountableSlugify,
} from '@sindresorhus/slugify'
import * as YAML from 'yaml'
import { cache, cachified } from '#app/utils/cache.server.ts'
import {
	getContentDataCacheKey,
	getContentDataFile,
} from '#app/utils/content-data.server.ts'
import {
	markdownToHtml,
	markdownToHtmlUnwrapped,
	stripHtml,
} from '#app/utils/markdown.server.ts'
import { formatDate, typedBoolean } from '#app/utils/misc.ts'
import { type Timings } from './timing.server.ts'

type RawTalk = {
	title?: string
	tag?: string
	tags?: Array<string>
	/** Stable URL/favorite id. Defaults to a slugified title when omitted. */
	slug?: string
	/** Former slugs that should redirect to the canonical `slug`. */
	previousSlugs?: Array<string>
	resources?: Array<string>
	description?: string
	deliveries?: Array<{ event?: string; date?: string; recording?: string }>
}

type Talk = Awaited<ReturnType<typeof getTalk>>

let _slugify: CountableSlugify

async function getSlugify() {
	if (!_slugify) {
		_slugify = slugifyWithCounter()
	}
	return _slugify
}

function normalizeSlugList(slugs: Array<string> | undefined): Array<string> {
	if (!slugs?.length) return []
	const seen = new Set<string>()
	const normalized: Array<string> = []
	for (const slug of slugs) {
		const trimmed = typeof slug === 'string' ? slug.trim() : ''
		if (!trimmed || seen.has(trimmed)) continue
		seen.add(trimmed)
		normalized.push(trimmed)
	}
	return normalized
}

function resolveTalkSlug(
	rawTalk: Pick<RawTalk, 'title' | 'slug'>,
	slugify: (input: string) => string,
): string {
	const explicit = rawTalk.slug?.trim()
	if (explicit) return explicit
	return slugify(rawTalk.title ?? 'TBA')
}

function findTalkBySlug<
	T extends { slug: string; previousSlugs: Array<string> },
>(talks: Array<T>, requestSlug: string | undefined): T | undefined {
	if (!requestSlug) return undefined
	return talks.find(
		(talk) =>
			talk.slug === requestSlug || talk.previousSlugs.includes(requestSlug),
	)
}

async function getTalk(rawTalk: RawTalk, allTags: Array<string>) {
	const slugify = await getSlugify()
	const slug = resolveTalkSlug(rawTalk, slugify)
	const previousSlugs = normalizeSlugList(rawTalk.previousSlugs).filter(
		(previousSlug) => previousSlug !== slug,
	)
	const descriptionHTML = rawTalk.description
		? await markdownToHtml(rawTalk.description)
		: ''
	return {
		title: rawTalk.title ?? 'TBA',
		tag:
			allTags.find((tag) => rawTalk.tags?.includes(tag)) ?? rawTalk.tags?.[0],
		tags: rawTalk.tags ?? [],
		slug,
		previousSlugs,
		resourceHTMLs: rawTalk.resources
			? await Promise.all(rawTalk.resources.map((r) => markdownToHtml(r)))
			: [],
		descriptionHTML,
		description: descriptionHTML ? await stripHtml(descriptionHTML) : '',
		deliveries: (rawTalk.deliveries
			? await Promise.all(
					rawTalk.deliveries.map(async (d) => {
						return {
							eventHTML: d.event
								? await markdownToHtmlUnwrapped(d.event)
								: undefined,
							date: d.date,
							recording: d.recording,
							dateDisplay: d.date ? formatDate(d.date) : 'TBA',
						}
					}),
				)
			: []
		).sort((a, b) => {
			return a.date && b.date ? (moreRecent(a.date, b.date) ? -1 : 1) : 0
		}),
	}
}

function sortByPresentationDate(a: Talk, b: Talk) {
	const mostRecentA = mostRecent(
		a.deliveries.map(({ date }) => date).filter(typedBoolean),
	)
	const mostRecentB = mostRecent(
		b.deliveries.map(({ date }) => date).filter(typedBoolean),
	)
	return moreRecent(mostRecentA, mostRecentB) ? -1 : 1
}

function mostRecent(dates: Array<string> = []) {
	return dates.reduce((recent: string, compare: string) => {
		if (!recent) return compare
		return moreRecent(compare, recent) ? compare : recent
	})
}

// returns true if a is more recent than b
function moreRecent(a: string | Date, b: string | Date) {
	if (typeof a === 'string') a = new Date(a)
	if (typeof b === 'string') b = new Date(b)
	return a > b
}

function getTags(talks: Array<RawTalk>): string[] {
	// get most used tags
	const tagCounts: Record<string, number> = {}

	for (const talk of talks) {
		if (!talk.tags) continue

		for (const tag of talk.tags) {
			tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
		}
	}

	const tags = Object.entries(tagCounts)
		.filter(([_tag, counts]) => counts > 1) // only include tags assigned to >1 talks
		.sort((l, r) => r[1] - l[1]) // sort on num occurrences
		.map(([tag]) => tag) // extract tags, ditch the counts

	return tags
}

async function getTalksAndTags({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	const slugify = await getSlugify()
	slugify.reset()

	const key = getContentDataCacheKey('talks.yml')
	try {
		return await cachified({
			cache,
			request,
			timings,
			key,
			ttl: 1000 * 60 * 60 * 24 * 14,
			staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
			forceFresh,
			getFreshValue: async () => {
				const talksString = await getContentDataFile('data/talks.yml')
				if (!talksString) {
					throw new Error('talks.yml is unavailable')
				}
				const rawTalks = YAML.parse(talksString) as Array<RawTalk>
				if (!Array.isArray(rawTalks)) {
					console.error('Talks is not an array', rawTalks)
					throw new Error('Talks is not an array.')
				}

				const allTags = getTags(rawTalks)

				const allTalks = await Promise.all(
					rawTalks.map((rawTalk) => getTalk(rawTalk, allTags)),
				)
				allTalks.sort(sortByPresentationDate)

				return { talks: allTalks, tags: allTags }
			},
			checkValue: (value: unknown) =>
				Boolean(value) &&
				typeof value === 'object' &&
				Array.isArray((value as { talks: [] }).talks) &&
				Array.isArray((value as { tags: [] }).tags),
		})
	} catch (error: unknown) {
		console.error(
			`talks: failed to load talks, returning empty fallback`,
			error,
		)
		return { talks: [], tags: [] }
	}
}

export { findTalkBySlug, getTalksAndTags, normalizeSlugList, resolveTalkSlug }
