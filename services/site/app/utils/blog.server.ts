import { subMonths, subYears } from 'date-fns'
import pLimit from 'p-limit'
import { type MdxListItem, type Team, type User } from '#app/types.ts'
import { shuffle } from '#app/utils/cjs/lodash.ts'
import { filterPosts } from './blog.ts'
import { cache, cachified, lruCache } from './cache.server.ts'
import { getClientSession } from './client.server.ts'
import { sendMessageFromDiscordBot } from './discord.server.ts'
import { getEnv } from './env.server.ts'
import { getBlogMdxListItems } from './mdx.server.ts'
import { getDomainUrl, getOptionalTeam, teams, typedBoolean } from './misc.ts'
import { prisma } from './prisma.server.ts'
import { getUser } from './session.server.ts'
import { teamEmoji } from './team-provider.tsx'
import { time, type Timings } from './timing.server.ts'

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
	const client = await getClientSession(request, user)
	const clientId = client.getClientId()
	const where = user
		? { user: { id: user.id }, postSlug: { notIn: exclude.filter(Boolean) } }
		: { clientId, postSlug: { notIn: exclude.filter(Boolean) } }
	const readPosts = await time(
		prisma.postRead.groupBy({
			by: ['postSlug'],
			where,
		}),
		{
			timings,
			type: 'getReadPosts',
			desc: 'getting slugs of all posts read by user',
		},
	)
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
		cache: lruCache,
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
				const result = await promiseWithTimeout(
					prisma.postRead.groupBy({
						by: ['postSlug'],
						_count: { postSlug: true },
					}),
					timeoutMs,
				)

				return Object.fromEntries(
					result.map((r) => [r.postSlug, r._count.postSlug]),
				) as Record<string, number>
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

function isRawQueryResult(
	result: any,
): result is Array<Record<string, unknown>> {
	return Array.isArray(result) && result.every((r) => typeof r === 'object')
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
		cache: lruCache,
		ttl: 1000 * 60 * 5,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		request,
		timings,
		checkValue: (value: unknown) => typeof value === 'number',
		getFreshValue: async () => {
			// couldn't figure out how to do this in one query with out $queryRaw 🤷‍♂️
			const result = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(DISTINCT "userId") FROM "PostRead" WHERE "userId" IS NOT NULL) +
        (SELECT COUNT(DISTINCT "clientId") FROM "PostRead" WHERE "clientId" IS NOT NULL)`
			if (!isRawQueryResult(result)) {
				console.error(`Unexpected result from getReaderCount: ${result}`)
				return 0
			}
			const count = Object.values(result[0] ?? [])[0] ?? 0
			// the count is a BigInt, so we need to convert it to a number
			return Number(count)
		},
	})
}

export type ReadRankings = Awaited<ReturnType<typeof getBlogReadRankings>>

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
	const key = slug ? `blog:${slug}:rankings` : `blog:rankings`
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
			const rawRankingData = await Promise.all(
				teams.map(async function getRankingsForTeam(team): Promise<{
					team: Team
					totalCount: number
					ranking: number
				}> {
					const totalCount = await prisma.postRead.count({
						where: {
							postSlug: slug,
							user: { team },
						},
					})
					const activeMembers = await getActiveMembers({ team, timings })
					const recentReads = await getRecentReads({ slug, team, timings })
					let ranking = 0
					if (activeMembers) {
						ranking = Number((recentReads / activeMembers).toFixed(4))
					}
					return { team, totalCount, ranking }
				}),
			)
			const rankings = rawRankingData.map((r) => r.ranking)
			const maxRanking = Math.max(...rankings)
			const minRanking = Math.min(...rankings)
			const rankPercentages = rawRankingData.map(
				({ team, totalCount, ranking }) => {
					return {
						team,
						totalCount,
						ranking,
						percent: Number(
							((ranking - minRanking) / (maxRanking - minRanking || 1)).toFixed(
								2,
							),
						),
					}
				},
			)

			return rankPercentages
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

			// each of the getBlogReadRankings calls results in 9 database queries
			// and we don't want to hit the limit of connections so we limit this
			// to 2 at a time. Though most of the data should be cached anyway.
			// This is good to just be certain.
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

async function getRecentReads({
	slug,
	team,
	timings,
}: {
	slug: string | undefined
	team: Team
	timings?: Timings
}) {
	const withinTheLastSixMonths = subMonths(new Date(), 6)

	const count = await time(
		prisma.postRead.count({
			where: {
				postSlug: slug,
				createdAt: { gt: withinTheLastSixMonths },
				user: { team },
			},
		}),
		{
			timings,
			type: 'getRecentReads',
			desc: `Getting reads of ${slug} by ${team} within the last 6 months`,
		},
	)
	return count
}

async function getActiveMembers({
	team,
	timings,
}: {
	team: Team
	timings?: Timings
}) {
	const withinTheLastYear = subYears(new Date(), 1)

	const count = await time(
		prisma.user.count({
			where: {
				team,
				postReads: {
					some: {
						createdAt: { gt: withinTheLastYear },
					},
				},
			},
		}),
		{
			timings,
			type: 'getActiveMembers',
			desc: `Getting active members of ${team}`,
		},
	)

	return count
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
		prisma.postRead.findMany({
			where: user ? { userId: user.id } : { clientId },
			select: { postSlug: true },
		}),
		{
			timings,
			type: 'getSlugReadsByUser',
			desc: `Getting reads by ${user ? user.id : clientId}`,
		},
	)
	return Array.from(new Set(reads.map((read) => read.postSlug)))
}

async function getPodcastEpisodeListenCounts({
	request,
	timings,
	forceFresh,
}: {
	request?: Request
	timings?: Timings
	forceFresh?: boolean
}) {
	return cachified({
		key: 'podcast:episode-listen-counts',
		ttl: 1000 * 60 * 30,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		cache: lruCache,
		request,
		timings,
		forceFresh,
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
				const result = await promiseWithTimeout(
					prisma.podcastEpisodeListen.groupBy({
						by: ['seasonNumber', 'episodeNumber'],
						_count: { _all: true },
					}),
					timeoutMs,
				)

				return Object.fromEntries(
					result.map((row) => [
						`${row.seasonNumber}:${row.episodeNumber}`,
						row._count._all,
					]),
				) as Record<string, number>
			} catch (error: unknown) {
				console.error(`Failed to get podcast episode listen counts`, error)
				context.metadata.ttl = 1000 * 60
				return {}
			}
		},
	})
}

async function getTotalPodcastEpisodeListens({
	request,
	seasonNumber,
	episodeNumber,
	timings,
	forceFresh,
}: {
	request?: Request
	seasonNumber?: number
	episodeNumber?: number
	timings?: Timings
	forceFresh?: boolean
}) {
	const hasEpisode = seasonNumber !== undefined && episodeNumber !== undefined
	const key = hasEpisode
		? `total-podcast-episode-listens:${seasonNumber}:${episodeNumber}`
		: 'total-podcast-episode-listens:__all__'
	return cachified({
		key,
		cache: lruCache,
		ttl: 1000 * 60 * 30,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		request,
		timings,
		forceFresh,
		checkValue: (value: unknown) => typeof value === 'number',
		getFreshValue: async () => {
			const listenCounts = await getPodcastEpisodeListenCounts({
				request,
				timings,
				forceFresh,
			})
			if (hasEpisode) {
				return listenCounts[`${seasonNumber}:${episodeNumber}`] ?? 0
			}
			return Object.values(listenCounts).reduce((sum, count) => sum + count, 0)
		},
	})
}

async function getPodcastListenRankings({
	request,
	seasonNumber,
	episodeNumber,
	forceFresh,
	timings,
}: {
	request?: Request
	seasonNumber?: number
	episodeNumber?: number
	forceFresh?: boolean
	timings?: Timings
}) {
	const hasEpisode = seasonNumber !== undefined && episodeNumber !== undefined
	const episodeKey =
		hasEpisode ? `${seasonNumber}:${episodeNumber}` : '__all_episodes__'
	const key = hasEpisode ? `podcast:${episodeKey}:rankings` : 'podcast:rankings'
	const rankingObjs = await cachified({
		key,
		cache,
		request,
		timings,
		ttl: hasEpisode ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		forceFresh,
		checkValue: (value: unknown) =>
			Array.isArray(value) &&
			value.every((v) => typeof v === 'object' && 'team' in v),
		getFreshValue: async () => {
			const rawRankingData = await Promise.all(
				teams.map(async function getRankingsForTeam(team): Promise<{
					team: Team
					totalCount: number
					ranking: number
				}> {
					const where = hasEpisode
						? {
								seasonNumber,
								episodeNumber,
								user: { team },
							}
						: {
								user: { team },
							}
					const totalCount = await prisma.podcastEpisodeListen.count({ where })
					const activeMembers = await getPodcastActiveMembers({ team, timings })
					const recentListens = await getRecentPodcastListens({
						seasonNumber,
						episodeNumber,
						team,
						timings,
					})
					let ranking = 0
					if (activeMembers) {
						ranking = Number((recentListens / activeMembers).toFixed(4))
					}
					return { team, totalCount, ranking }
				}),
			)
			const rankings = rawRankingData.map((r) => r.ranking)
			const maxRanking = Math.max(...rankings)
			const minRanking = Math.min(...rankings)
			return rawRankingData.map(({ team, totalCount, ranking }) => ({
				team,
				totalCount,
				ranking,
				percent: Number(
					((ranking - minRanking) / (maxRanking - minRanking || 1)).toFixed(2),
				),
			}))
		},
	})

	return rankingObjs.sort(({ percent: a }, { percent: b }) =>
		b === a ? (Math.random() > 0.5 ? -1 : 1) : a > b ? -1 : 1,
	)
}

async function getPodcastListenLeadersBySeason({
	request,
	seasonNumber,
	forceFresh,
	timings,
}: {
	request?: Request
	seasonNumber: number
	forceFresh?: boolean
	timings?: Timings
}) {
	const key = `podcast:${seasonNumber}:episode-leaders`
	return cachified({
		key,
		cache,
		request,
		timings,
		ttl: 1000 * 60 * 60 * 24 * 7,
		staleWhileRevalidate: 1000 * 60 * 60 * 24,
		forceFresh,
		checkValue: (value: unknown): value is Record<string, Team | null> =>
			value !== null &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			Object.values(value as Record<string, Team | null>).every(
				(team) => team === null || teams.includes(team as Team),
			),
		getFreshValue: async () => {
			const [activeMembersEntries, recentListensEntries] = await Promise.all([
				Promise.all(
					teams.map(async (team) => [
						team,
						await getPodcastActiveMembers({ team, timings }),
					]),
				),
				Promise.all(
					teams.map(async (team) => [
						team,
						await getRecentPodcastListensByEpisode({
							seasonNumber,
							team,
							timings,
						}),
					]),
				),
			])
			const activeMembersByTeam = Object.fromEntries(
				activeMembersEntries,
			) as Record<Team, number>
			const recentListensByTeam = Object.fromEntries(
				recentListensEntries,
			) as Record<Team, Record<number, number>>

			const episodeNumbers = new Set<number>()
			for (const team of teams) {
				for (const episodeNumber of Object.keys(
					recentListensByTeam[team] ?? {},
				)) {
					episodeNumbers.add(Number(episodeNumber))
				}
			}

			const leadersByEpisode: Record<string, Team | null> = {}
			for (const episodeNumber of episodeNumbers) {
				const rankings = teams.map((team) => {
					const activeMembers = activeMembersByTeam[team] ?? 0
					const recentListens = recentListensByTeam[team]?.[episodeNumber] ?? 0
					const ranking = activeMembers
						? Number((recentListens / activeMembers).toFixed(4))
						: 0
					return { team, ranking }
				})
				const maxRanking = Math.max(...rankings.map((entry) => entry.ranking))
				if (maxRanking <= 0) {
					leadersByEpisode[String(episodeNumber)] = null
					continue
				}
				const tiedLeaders = rankings.filter(
					(entry) => entry.ranking === maxRanking,
				)
				const chosenLeader =
					tiedLeaders[Math.floor(Math.random() * tiedLeaders.length)]
				leadersByEpisode[String(episodeNumber)] = chosenLeader?.team ?? null
			}
			return leadersByEpisode
		},
	})
}

async function getRecentPodcastListens({
	seasonNumber,
	episodeNumber,
	team,
	timings,
}: {
	seasonNumber?: number
	episodeNumber?: number
	team: Team
	timings?: Timings
}) {
	const withinTheLastSixMonths = subMonths(new Date(), 6)
	const count = await time(
		prisma.podcastEpisodeListen.count({
			where: {
				...(seasonNumber !== undefined && episodeNumber !== undefined
					? { seasonNumber, episodeNumber }
					: {}),
				createdAt: { gt: withinTheLastSixMonths },
				user: { team },
			},
		}),
		{
			timings,
			type: 'getRecentPodcastListens',
			desc: `Getting podcast listens${
				seasonNumber ? ` of ${seasonNumber}:${episodeNumber}` : ''
			} by ${team} within the last 6 months`,
		},
	)
	return count
}

async function getRecentPodcastListensByEpisode({
	seasonNumber,
	team,
	timings,
}: {
	seasonNumber: number
	team: Team
	timings?: Timings
}) {
	const withinTheLastSixMonths = subMonths(new Date(), 6)
	const rows = await time(
		prisma.podcastEpisodeListen.groupBy({
			by: ['episodeNumber'],
			where: {
				seasonNumber,
				createdAt: { gt: withinTheLastSixMonths },
				user: { team },
			},
			_count: { _all: true },
		}),
		{
			timings,
			type: 'getRecentPodcastListensByEpisode',
			desc: `Getting podcast listens of season ${seasonNumber} by ${team} within the last 6 months`,
		},
	)
	return Object.fromEntries(
		rows.map((row) => [row.episodeNumber, row._count._all]),
	)
}

async function getPodcastActiveMembers({
	team,
	timings,
}: {
	team: Team
	timings?: Timings
}) {
	const withinTheLastYear = subYears(new Date(), 1)
	const count = await time(
		prisma.user.count({
			where: {
				team,
				podcastEpisodeListens: {
					some: {
						createdAt: { gt: withinTheLastYear },
					},
				},
			},
		}),
		{
			timings,
			type: 'getPodcastActiveMembers',
			desc: `Getting active podcast listeners of ${team}`,
		},
	)
	return count
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
	getBlogRecommendations,
	getBlogReadRankings,
	getAllBlogPostReadRankings,
	getSlugReadsByUser,
	getBlogPostReadCounts,
	getPodcastEpisodeListenCounts,
	getPodcastListenLeadersBySeason,
	getPodcastListenRankings,
	getTotalPodcastEpisodeListens,
	getTotalPostReads,
	getReaderCount,
	getPostJson,
	notifyOfTeamLeaderChangeOnPost,
	notifyOfOverallTeamLeaderChange,
}
