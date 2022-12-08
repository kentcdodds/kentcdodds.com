import type {Team, MdxListItem, Await, User} from '~/types'
import {subYears, subMonths} from 'date-fns'
import {shuffle} from 'lodash'
import {getBlogMdxListItems} from './mdx'
import {prisma} from './prisma.server'
import {
  getDomainUrl,
  getOptionalTeam,
  getRequiredServerEnvVar,
  teams,
  typedBoolean,
} from './misc'
import {getSession, getUser} from './session.server'
import {filterPosts} from './blog'
import {getClientSession} from './client.server'
import {cache, cachified, lruCache} from './cache.server'
import {sendMessageFromDiscordBot} from './discord.server'
import {teamEmoji} from './team-provider'
import type {Timings} from './timing.server'
import {time} from './timing.server'

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
  const allPosts = await getBlogMdxListItems({forceFresh: false, timings})

  // exclude what they want us to + any posts that are labeled as archived or draft.
  let exclude = Array.from(
    new Set([
      ...externalExclude,
      ...allPosts
        .filter(
          post =>
            post.frontmatter.unlisted ??
            post.frontmatter.archived ??
            post.frontmatter.draft,
        )
        .map(p => p.slug),
    ]),
  )
  // filter out what they've already read
  const session = await getSession(request)
  const user = await session.getUser()
  const client = await getClientSession(request, user)
  const clientId = client.getClientId()
  const where = user
    ? {user: {id: user.id}, postSlug: {notIn: exclude.filter(Boolean)}}
    : {clientId, postSlug: {notIn: exclude.filter(Boolean)}}
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
  exclude.push(...readPosts.map(p => p.postSlug))

  const recommendablePosts = allPosts.filter(
    post => !exclude.includes(post.slug),
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
          new Set(...keywords.map(k => filterPosts(recommendablePosts, k))),
        )
      : recommendablePosts
    const bestMatchRecommendations = shuffle(
      postsByBestMatch.slice(0, limitPerGroup * 4),
    ).slice(0, limitPerGroup)
    recommendations.push(...bestMatchRecommendations)

    exclude = [...exclude, ...bestMatchRecommendations.map(({slug}) => slug)]
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
      .map(slug => recommendablePosts.find(({slug: s}) => s === slug))
      .filter(typedBoolean),
  ).slice(0, limitPerGroup)
  recommendations.push(...mostPopularRecommendations)
  exclude = [...exclude, ...mostPopularRecommendationSlugs]

  if (recommendations.length < limit) {
    // fill in the rest with random posts
    const remainingPosts = recommendablePosts.filter(
      ({slug}) => !exclude.includes(slug),
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

async function getMostPopularPostSlugs({
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
  const postsSortedByMostPopular = await cachified({
    key: `sorted-most-popular-post-slugs`,
    ttl: 1000 * 60 * 30,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    cache: lruCache,
    request,
    getFreshValue: async () => {
      const result = await prisma.postRead.groupBy({
        by: ['postSlug'],
        _count: true,
        orderBy: {
          _count: {
            postSlug: 'desc',
          },
        },
      })

      return result.map(p => p.postSlug)
    },
    timings,
    checkValue: (value: unknown) =>
      Array.isArray(value) && value.every(v => typeof v === 'string'),
  })
  // NOTE: we're not using exclude and limit in the query itself because it's
  // a slow query and quite hard to cache. It's not a lot of data that's returned
  // anyway, so we can easily filter it out here.
  return postsSortedByMostPopular
    .filter(s => !exclude.includes(s))
    .slice(0, limit)
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
    ttl: 1000 * 60,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    request,
    timings,
    checkValue: (value: unknown) => typeof value === 'number',
    getFreshValue: () =>
      prisma.postRead.count(slug ? {where: {postSlug: slug}} : undefined),
  })
}

function isRawQueryResult(
  result: any,
): result is Array<Record<string, unknown>> {
  return Array.isArray(result) && result.every(r => typeof r === 'object')
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

export type ReadRankings = Await<ReturnType<typeof getBlogReadRankings>>

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
      value.every(v => typeof v === 'object' && 'team' in v),
    getFreshValue: async () => {
      const rawRankingData = await Promise.all(
        teams.map(async function getRankingsForTeam(
          team,
        ): Promise<{team: Team; totalReads: number; ranking: number}> {
          const totalReads = await prisma.postRead.count({
            where: {
              postSlug: slug,
              user: {team},
            },
          })
          const activeMembers = await getActiveMembers({team, timings})
          const recentReads = await getRecentReads({slug, team, timings})
          let ranking = 0
          if (activeMembers) {
            ranking = Number((recentReads / activeMembers).toFixed(4))
          }
          return {team, totalReads, ranking}
        }),
      )
      const rankings = rawRankingData.map(r => r.ranking)
      const maxRanking = Math.max(...rankings)
      const minRanking = Math.min(...rankings)
      const rankPercentages = rawRankingData.map(
        ({team, totalReads, ranking}) => {
          return {
            team,
            totalReads,
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
      .sort(({percent: a}, {percent: b}) =>
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
      const posts = await getBlogMdxListItems({request, timings})
      const {default: pLimit} = await import('p-limit')

      // each of the getBlogReadRankings calls results in 9 database queries
      // and we don't want to hit the limit of connections so we limit this
      // to 2 at a time. Though most of the data should be cached anyway.
      // This is good to just be certain.
      const limit = pLimit(2)
      const allPostReadRankings: Record<string, ReadRankings> = {}
      await Promise.all(
        posts.map(post =>
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
        createdAt: {gt: withinTheLastSixMonths},
        user: {team},
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
            createdAt: {gt: withinTheLastYear},
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
      where: user ? {userId: user.id} : {clientId},
      select: {postSlug: true},
    }),
    {
      timings,
      type: 'getSlugReadsByUser',
      desc: `Getting reads by ${user ? user.id : clientId}`,
    },
  )
  return Array.from(new Set(reads.map(read => read.postSlug)))
}

async function getPostJson(request: Request) {
  const posts = await getBlogMdxListItems({request})

  const blogUrl = `${getDomainUrl(request)}/blog`

  return posts.map(post => {
    const {
      slug,
      frontmatter: {title, description, meta: {keywords = []} = {}, categories},
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

const leaderboardChannelId = getRequiredServerEnvVar(
  'DISCORD_LEADERBOARD_CHANNEL',
)

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
  getTotalPostReads,
  getReaderCount,
  getPostJson,
  notifyOfTeamLeaderChangeOnPost,
  notifyOfOverallTeamLeaderChange,
}
