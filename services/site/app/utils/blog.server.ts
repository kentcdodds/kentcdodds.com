import { subMonths, subYears } from 'date-fns'
import { and, eq, gt, notInList } from '@remix-run/data-table'
import pLimit from 'p-limit'
import { type MdxListItem, type Team, type User } from '#app/types.ts'
import {
	hasIncrementableRankings,
	incrementTeamRankings,
	type BlogReadRanking,
} from '#app/utils/blog-rankings.ts'
import { shuffle } from '#app/utils/cjs/lodash.ts'
import { db } from '#app/utils/db.server.ts'
import { postReadTable } from '#app/utils/db/schema.server.ts'
import {
	countPostReadReaders,
	incrementPostReadSlugCount,
	listPostReadSlugCounts,
	loadBlogReadRankings,
	recordPostReadReader,
	userHasPostReadSince,
} from '#app/utils/post-read-aggregates.server.ts'
import { filterPosts } from './blog.ts'
import { cache, cachified, lruCache } from './cache.server.ts'
import { getClientSession, hasClientSessionCookie } from './client.server.ts'
import { sendMessageFromDiscordBot } from './discord.server.ts'
import { getEnv } from './env.server.ts'
import { getBlogMdxListItems } from './mdx.server.ts'
import { getDomainUrl, getOptionalTeam, typedBoolean } from './misc.ts'
import { getUser } from './session.server.ts'
import { teamEmoji } from './team-provider.tsx'
import { time, type Timings } from './timing.server.ts'

async function addPostRead({
	slug,
	userId,
	clientId,
}: { slug: string } & (
	| { userId: string; clientId?: undefined }
	| { userId?: undefined; clientId: string }
)) {
	const ownerWhere = userId ? { userId } : { clientId }
	const readInLastWeek = await db.findOne(postReadTable, {
		where: and(
			...(userId
				? [eq('userId', userId)]
				: [eq('clientId', clientId as string)]),
			eq('postSlug', slug),
			gt('createdAt', new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)),
		),
	})
	if (readInLastWeek) {
		return null
	}

	const yearAgo = subYears(new Date(), 1)
	const newlyActive = userId
		? !(await userHasPostReadSince({ userId, since: yearAgo }))
		: false

	const postRead = await db.create(
		postReadTable,
		{ postSlug: slug, ...ownerWhere },
		{ returnRow: true },
	)
	await incrementPostReadSlugCount(slug)
	const newReader = userId
		? await recordPostReadReader('user', userId)
		: await recordPostReadReader('client', clientId as string)
	return { id: postRead.id, newlyActive, newReader }
}

async function getBlogRecommendations({
	request,
	limit = 3,
	keywords = [],
	exclude: externalExclude = [],
	timings,
}: {
	request: Request
	limit?: number | null
	keywords?: Array<string>
	exclude?: Array<string>
	timings?: Timings
}) {
	// if we passed the request here, any "fresh" request on a post would
	// result in refreshing *all* blog posts which is probably not what we want.
	const allPosts = await getBlogMdxListItems({ forceFresh: false, timings })

	// exclude what they want us to + any posts that are labeled as archived or draft.
	let exclude = Array.from(
		new Set([
			...externalExclude,
			...allPosts
				.filter(
					(post) =>
						post.frontmatter.unlisted ??
						post.frontmatter.archived ??
						post.frontmatter.draft,
				)
				.map((p) => p.slug),
		]),
	)
	// filter out what they've already read
	const user = await getUser(request)
	const readPosts =
		user || hasClientSessionCookie(request)
			? await time(
					(async () => {
						const excludedSlugs = exclude.filter(Boolean)
						const clientId = user
							? null
							: (await getClientSession(request, user)).getClientId()
						const predicates = [
							...(user
								? [eq('userId', user.id)]
								: clientId
									? [eq('clientId', clientId)]
									: []),
							...(excludedSlugs.length > 0
								? [notInList('postSlug', excludedSlugs)]
								: []),
						]
						if (predicates.length === 0) return []
						return db
							.query(postReadTable)
							.where(and(...predicates))
							.groupBy('postSlug')
							.select('postSlug')
							.all()
					})(),
					{
						timings,
						type: 'getReadPosts',
						desc: 'getting slugs of all posts read by user',
					},
				)
			: []
	exclude.push(...readPosts.map((p) => p.postSlug))

	const recommendablePosts = allPosts.filter(
		(post) => !exclude.includes(post.slug),
	)

	if (limit === null) return shuffle(recommendablePosts)

	const recommendations: Array<MdxListItem> = []
	// if no keywords were given, then we won't have a group for best match
	// so there will only be two groups
	const groupsCount = keywords.length ? 3 : 2
	const limitPerGroup = Math.floor(limit / groupsCount) || 1

	if (keywords.length) {
		// get best match posts
		const postsByBestMatch = keywords.length
			? Array.from(
					new Set(...keywords.map((k) => filterPosts(recommendablePosts, k))),
				)
			: recommendablePosts
		const bestMatchRecommendations = shuffle(
			postsByBestMatch.slice(0, limitPerGroup * 4),
		).slice(0, limitPerGroup)
		recommendations.push(...bestMatchRecommendations)

		exclude = [...exclude, ...bestMatchRecommendations.map(({ slug }) => slug)]
	}

	// get most popular posts
	const mostPopularRecommendationSlugs = await getMostPopularPostSlugs({
		// get 4x the limit so we can have a little randomness
		limit: limitPerGroup * 4,
		exclude,
		timings,
		request,
	})
	const mostPopularRecommendations = shuffle(
		mostPopularRecommendationSlugs
			.map((slug) => recommendablePosts.find(({ slug: s }) => s === slug))
			.filter(typedBoolean),
	).slice(0, limitPerGroup)
	recommendations.push(...mostPopularRecommendations)
	exclude = [...exclude, ...mostPopularRecommendationSlugs]

	if (recommendations.length < limit) {
		// fill in the rest with random posts
		const remainingPosts = recommendablePosts.filter(
			({ slug }) => !exclude.includes(slug),
		)
		const completelyRandomRecommendations = shuffle(remainingPosts).slice(
			0,
			limit - recommendations.length,
		)
		recommendations.push(...completelyRandomRecommendations)
	}

	// then mix them up
	return shuffle(recommendations)
}

export async function getMostPopularPostSlugs({
	limit,
	exclude,
	timings,
	request,
}: {
	limit: number
	exclude: Array<string>
	timings?: Timings
	request: Request
}) {
	// NOTE: getBlogPostReadCounts is the canonical cached query; we derive
	// most-popular ordering from its cached map to avoid duplicate DB queries.
	const readCounts = await getBlogPostReadCounts({ request, timings })
	const postsSortedByMostPopular = Object.entries(readCounts)
		.sort(([aSlug, aCount], [bSlug, bCount]) => {
			if (bCount !== aCount) return bCount - aCount
			// deterministic tie-breaker
			return aSlug.localeCompare(bSlug)
		})
		.map(([slug]) => slug)

	return postsSortedByMostPopular
		.filter((s) => !exclude.includes(s))
		.slice(0, limit)
}

async function promiseWithTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs)
	})
	try {
		return await Promise.race([promise, timeoutPromise])
	} finally {
		if (timeoutHandle) clearTimeout(timeoutHandle)
	}
}

async function getBlogPostReadCounts({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	return cachified({
		key: `blog:post-read-counts`,
		ttl: 1000 * 60 * 30,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		// Shared KV cache: isolate-local lruCache would recompute on every
		// isolate churn. The fresh value now reads PostReadSlugCount (~one row
		// per slug) instead of GROUP BY PostRead.
		cache,
		request,
		timings,
		checkValue: (value: unknown) =>
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value) &&
			Object.values(value as Record<string, unknown>).every(
				(v) => typeof v === 'number',
			),
		getFreshValue: async (context) => {
			try {
				const timeoutMs = context.background ? 1000 * 10 : 1000 * 5
				return await promiseWithTimeout(listPostReadSlugCounts(), timeoutMs)
			} catch (error: unknown) {
				// Popularity counts should not take down the whole /blog page.
				console.error(`Failed to get blog post read counts`, error)
				// Retry sooner when we hit the fallback.
				context.metadata.ttl = 1000 * 60
				return {}
			}
		},
	})
}

async function getTotalPostReads({
	request,
	slug,
	timings,
}: {
	request: Request
	slug?: string
	timings?: Timings
}) {
	const key = `total-post-reads:${slug ?? '__all-posts__'}`
	return cachified({
		key,
		cache: lruCache,
		ttl: 1000 * 60 * 30,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		request,
		timings,
		checkValue: (value: unknown) => typeof value === 'number',
		getFreshValue: async () => {
			// Reuse the grouped read-count cache so we avoid expensive per-slug
			// COUNT(*) scans on large PostRead tables.
			const readCounts = await getBlogPostReadCounts({ request, timings })
			if (slug) return readCounts[slug] ?? 0
			return Object.values(readCounts).reduce((sum, count) => sum + count, 0)
		},
	})
}

async function getReaderCount({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	const key = 'total-reader-count'
	return cachified({
		key,
		// Shared KV cache: isolate-local lruCache would recompute on every
		// isolate churn. Fresh value is COUNT(*) on PostReadReader (unique
		// readers), not COUNT(DISTINCT) over PostRead.
		cache,
		ttl: 1000 * 60 * 60,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		request,
		timings,
		checkValue: (value: unknown) => typeof value === 'number',
		getFreshValue: async () => countPostReadReaders(),
	})
}

export type ReadRankings = Array<BlogReadRanking>

const OVERALL_RANKINGS_CACHE_KEY = 'blog:rankings'
const ALL_POST_RANKINGS_CACHE_KEY = 'all-blog-post-read-rankings'
const POST_READ_COUNTS_CACHE_KEY = 'blog:post-read-counts'
const READER_COUNT_CACHE_KEY = 'total-reader-count'

function blogSlugRankingsCacheKey(slug: string) {
	return `blog:${slug}:rankings`
}

async function getBlogReadRankings({
	slug,
	request,
	forceFresh,
	timings,
}: {
	slug?: string
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	const key = slug ? blogSlugRankingsCacheKey(slug) : OVERALL_RANKINGS_CACHE_KEY
	const rankingObjs = await cachified({
		key,
		cache,
		request,
		timings,
		ttl: slug ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		forceFresh,
		checkValue: (value: unknown) =>
			Array.isArray(value) &&
			value.every((v) => typeof v === 'object' && 'team' in v),
		getFreshValue: async () => {
			return time(
				loadBlogReadRankings({
					slug,
					recentAfter: subMonths(new Date(), 6),
					activeSince: subYears(new Date(), 1),
				}),
				{
					timings,
					type: 'loadBlogReadRankings',
					desc: slug
						? `Loading team rankings for ${slug}`
						: 'Loading overall team rankings',
				},
			)
		},
	})

	return (
		rankingObjs
			// if they're the same, then we'll randomize their relative order.
			// Otherwise, it's greatest to smallest
			.sort(({ percent: a }, { percent: b }) =>
				b === a ? (Math.random() > 0.5 ? -1 : 1) : a > b ? -1 : 1,
			)
	)
}

async function getAllBlogPostReadRankings({
	request,
	forceFresh,
	timings,
}: {
	request?: Request
	forceFresh?: boolean
	timings?: Timings
}) {
	const key = 'all-blog-post-read-rankings'
	return cachified({
		key,
		cache,
		request,
		timings,
		forceFresh,
		ttl: 1000 * 60 * 5, // the underlying caching should be able to handle this every 5 minues
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		getFreshValue: async () => {
			const posts = await getBlogMdxListItems({ request, timings })

			// each slug ranking is itself cached; limit concurrency so a cold
			// all-posts refresh cannot fan out unbounded D1 queries.
			const limit = pLimit(2)
			const allPostReadRankings: Record<string, ReadRankings> = {}
			await Promise.all(
				posts.map((post) =>
					limit(async () => {
						allPostReadRankings[post.slug] = await getBlogReadRankings({
							request,
							slug: post.slug,
							timings,
						})
					}),
				),
			)
			return allPostReadRankings
		},
	})
}

async function writeCacheValue<Value>(
	key: string,
	value: Value,
	fallbackTtl: number,
) {
	const existing = await cache.get(key)
	await cache.set(key, {
		value,
		metadata: {
			createdTime: existing?.metadata.createdTime ?? Date.now(),
			ttl: existing?.metadata.ttl ?? fallbackTtl,
			swr: existing?.metadata.swr ?? 1000 * 60 * 60 * 24,
		},
	})
}

async function incrementCachedPostReadCounts({
	slug,
	newReader,
}: {
	slug: string
	newReader: boolean
}) {
	const countsEntry = await cache.get(POST_READ_COUNTS_CACHE_KEY)
	if (
		countsEntry &&
		typeof countsEntry.value === 'object' &&
		countsEntry.value !== null &&
		!Array.isArray(countsEntry.value)
	) {
		const value = {
			...(countsEntry.value as Record<string, number>),
		}
		value[slug] = (value[slug] ?? 0) + 1
		await writeCacheValue(POST_READ_COUNTS_CACHE_KEY, value, 1000 * 60 * 30)
	}

	const slugTotalKey = `total-post-reads:${slug}`
	const allTotalKey = 'total-post-reads:__all-posts__'
	const slugTotal = lruCache.get(slugTotalKey)
	if (typeof slugTotal?.value === 'number') {
		lruCache.set(slugTotalKey, {
			...slugTotal,
			value: slugTotal.value + 1,
		})
	}
	const allTotal = lruCache.get(allTotalKey)
	if (typeof allTotal?.value === 'number') {
		lruCache.set(allTotalKey, {
			...allTotal,
			value: allTotal.value + 1,
		})
	}

	if (newReader) {
		const readerEntry = await cache.get(READER_COUNT_CACHE_KEY)
		if (typeof readerEntry?.value === 'number') {
			await writeCacheValue(
				READER_COUNT_CACHE_KEY,
				readerEntry.value + 1,
				1000 * 60 * 60,
			)
		}
	}
}

async function patchAllBlogPostReadRankingsCache(
	slug: string,
	rankings: ReadRankings,
) {
	const entry = await cache.get(ALL_POST_RANKINGS_CACHE_KEY)
	if (!entry || typeof entry.value !== 'object' || entry.value === null) {
		return
	}
	await writeCacheValue(
		ALL_POST_RANKINGS_CACHE_KEY,
		{
			...(entry.value as Record<string, ReadRankings>),
			[slug]: rankings,
		},
		1000 * 60 * 5,
	)
}

async function applyPostReadToCachedAnalytics({
	request,
	slug,
	team,
	newlyActive,
	newReader,
	beforePostRankings,
	beforeOverallRankings,
}: {
	request: Request
	slug: string
	team: Team | null
	newlyActive: boolean
	newReader: boolean
	beforePostRankings: ReadRankings
	beforeOverallRankings: ReadRankings
}) {
	await incrementCachedPostReadCounts({ slug, newReader })

	if (!team) {
		return {
			afterPostRankings: beforePostRankings,
			afterOverallRankings: beforeOverallRankings,
		}
	}

	const afterPostRankings = hasIncrementableRankings(beforePostRankings)
		? incrementTeamRankings(beforePostRankings, team, { newlyActive })
		: await getBlogReadRankings({ request, slug, forceFresh: true })
	const afterOverallRankings = hasIncrementableRankings(beforeOverallRankings)
		? incrementTeamRankings(beforeOverallRankings, team, { newlyActive })
		: await getBlogReadRankings({ request, forceFresh: true })

	if (hasIncrementableRankings(beforePostRankings)) {
		await writeCacheValue(
			blogSlugRankingsCacheKey(slug),
			afterPostRankings,
			1000 * 60 * 60 * 24 * 7,
		)
	}
	if (hasIncrementableRankings(beforeOverallRankings)) {
		await writeCacheValue(
			OVERALL_RANKINGS_CACHE_KEY,
			afterOverallRankings,
			1000 * 60 * 60,
		)
	}
	await patchAllBlogPostReadRankingsCache(slug, afterPostRankings)

	return { afterPostRankings, afterOverallRankings }
}

async function getSlugReadsByUser({
	request,
	timings,
}: {
	request: Request
	timings?: Timings
}) {
	const user = await getUser(request)
	const clientSession = await getClientSession(request, user)
	const clientId = clientSession.getClientId()
	const reads = await time(
		db
			.query(postReadTable)
			.where(user ? { userId: user.id } : { clientId })
			.groupBy('postSlug')
			.select('postSlug')
			.all(),
		{
			timings,
			type: 'getSlugReadsByUser',
			desc: `Getting reads by ${user ? user.id : clientId}`,
		},
	)
	return reads.map((read) => read.postSlug)
}

async function getPostJson(request: Request) {
	const posts = await getBlogMdxListItems({ request })

	const blogUrl = `${getDomainUrl(request)}/blog`

	return posts.map((post) => {
		const {
			slug,
			frontmatter: {
				title,
				description,
				meta: { keywords = [] } = {},
				categories,
			},
		} = post
		return {
			id: slug,
			slug,
			productionUrl: `${blogUrl}/${slug}`,
			title,
			categories,
			keywords,
			description,
		}
	})
}

const leaderboardChannelId = getEnv().DISCORD_LEADERBOARD_CHANNEL

const getUserDiscordMention = (user: User) =>
	user.discordId ? `<@!${user.discordId}>` : user.firstName

async function notifyOfTeamLeaderChangeOnPost({
	request,
	prevLeader,
	newLeader,
	postSlug,
	reader,
}: {
	request: Request
	prevLeader?: Team
	newLeader: Team
	postSlug: string
	reader: User | null
}) {
	const blogUrl = `${getDomainUrl(request)}/blog`
	const newLeaderEmoji = teamEmoji[newLeader]
	const url = `${blogUrl}/${postSlug}`
	const newTeamMention = `the ${newLeaderEmoji} ${newLeader.toLowerCase()} team`
	if (prevLeader) {
		const prevLeaderEmoji = teamEmoji[prevLeader]
		const prevTeamMention = `the ${prevLeaderEmoji} ${prevLeader.toLowerCase()} team`
		if (reader && reader.team === newLeader) {
			const readerMention = getUserDiscordMention(reader)
			const cause = `${readerMention} just read ${url} and won the post from ${prevTeamMention} for ${newTeamMention}!`
			await sendMessageFromDiscordBot(
				leaderboardChannelId,
				`🎉 Congratulations to ${newTeamMention}! You've won a post!\n\n${cause}`,
			)
		} else {
			const who = reader
				? `Someone on the ${
						teamEmoji[getOptionalTeam(reader.team)]
					} ${reader.team.toLowerCase()} team`
				: `An anonymous user`
			const cause = `${who} just read ${url} and triggered a recalculation of the rankings: ${prevTeamMention} lost the post and it's now claimed by ${newTeamMention}!`
			await sendMessageFromDiscordBot(
				leaderboardChannelId,
				`🎉 Congratulations to ${newTeamMention}! You've won a post!\n\n${cause}`,
			)
		}
	} else if (reader) {
		const readerMention = getUserDiscordMention(reader)
		await sendMessageFromDiscordBot(
			leaderboardChannelId,
			`Congratulations to ${newTeamMention}! You've won a post!\n\n${readerMention} just read ${url} and claimed the post for ${newTeamMention}!`,
		)
	}
}

async function notifyOfOverallTeamLeaderChange({
	request,
	prevLeader,
	newLeader,
	postSlug,
	reader,
}: {
	request: Request
	prevLeader?: Team
	newLeader: Team
	postSlug: string
	reader: User | null
}) {
	const blogUrl = `${getDomainUrl(request)}/blog`
	const newLeaderEmoji = teamEmoji[newLeader]
	const url = `${blogUrl}/${postSlug}`

	const cause = reader
		? `${getUserDiscordMention(reader)} just read ${url}`
		: `An anonymous user just read ${url} triggering a ranking recalculation`

	if (prevLeader) {
		const prevLeaderEmoji = teamEmoji[prevLeader]
		await sendMessageFromDiscordBot(
			leaderboardChannelId,
			`🎉 Congratulations to the ${newLeaderEmoji} ${newLeader.toLowerCase()} team! ${cause} and knocked team ${prevLeaderEmoji} ${prevLeader.toLowerCase()} team off the top of the leader board! 👏`,
		)
	} else {
		await sendMessageFromDiscordBot(
			leaderboardChannelId,
			`🎉 Congratulations to the ${newLeaderEmoji} ${newLeader.toLowerCase()} team! ${cause} and took ${newLeader.toLowerCase()} team to the top of the leader board! 👏`,
		)
	}
}

export {
	addPostRead,
	getBlogRecommendations,
	getBlogReadRankings,
	getAllBlogPostReadRankings,
	getSlugReadsByUser,
	getBlogPostReadCounts,
	getTotalPostReads,
	getReaderCount,
	applyPostReadToCachedAnalytics,
	getPostJson,
	notifyOfTeamLeaderChangeOnPost,
	notifyOfOverallTeamLeaderChange,
}
