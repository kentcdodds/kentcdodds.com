import type {Team, MdxListItem, Await, User} from '~/types'
import {subYears, subMonths} from 'date-fns'
import {cachified} from 'cachified'
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
import {cache, lruCache, shouldForceFresh} from './cache.server'
import {sendMessageFromDiscordBot} from './discord.server'
import {teamEmoji} from './team-provider'

async function getBlogRecommendations(
  request: Request,
  {
    limit = 3,
    keywords = [],
    exclude: externalExclude = [],
  }: {
    limit?: number | null
    keywords?: Array<string>
    exclude?: Array<string>
  } = {},
) {
  // if we passed the request here, any "fresh" request on a post would
  // result in refreshing *all* blog posts which is probably not what we want.
  const allPosts = await getBlogMdxListItems({forceFresh: false})

  // exclude what they want us to + any posts that are labeled as archived or draft.
  let exclude = Array.from(
    new Set([
      ...externalExclude,
      ...allPosts
        .filter(post => post.frontmatter.archived ?? post.frontmatter.draft)
        .map(p => p.slug),
    ]),
  )
  // filter out what they've already read
  const session = await getSession(request)
  const client = await getClientSession(request)
  const clientId = client.getClientId()
  const user = await session.getUser()
  const where = user
    ? {user: {id: user.id}, postSlug: {notIn: exclude.filter(Boolean)}}
    : {clientId, postSlug: {notIn: exclude.filter(Boolean)}}
  const readPosts = await prisma.postRead.groupBy({
    by: ['postSlug'],
    where,
  })
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
}: {
  limit: number
  exclude: Array<string>
}) {
  // don't bother caching if there's an exclude... Too many permutations
  if (exclude.length) return getFreshValue()

  async function getFreshValue() {
    const result = await prisma.postRead.groupBy({
      by: ['postSlug'],
      _count: true,
      orderBy: {
        _count: {
          postSlug: 'desc',
        },
      },
      where: {
        postSlug: {notIn: exclude.filter(Boolean)},
      },
      take: limit,
    })

    return result.map(p => p.postSlug)
  }

  return cachified({
    key: `${limit}-most-popular-post-slugs`,
    ttl: 1000 * 60,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    cache: lruCache,
    getFreshValue,
    checkValue: (value: unknown) =>
      Array.isArray(value) && value.every(v => typeof v === 'string'),
  })
}

async function getTotalPostReads(request: Request, slug?: string) {
  const key = `total-post-reads:${slug ?? '__all-posts__'}`
  return cachified({
    key,
    cache: lruCache,
    ttl: 1000 * 60,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    forceFresh: await shouldForceFresh({request, key}),
    checkValue: (value: unknown) => typeof value === 'number',
    getFreshValue: () =>
      prisma.postRead.count(slug ? {where: {postSlug: slug}} : undefined),
  })
}

async function getReaderCount(request: Request) {
  const key = 'total-reader-count'
  return cachified({
    key,
    cache: lruCache,
    ttl: 1000 * 60 * 5,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    forceFresh: await shouldForceFresh({request, key}),
    checkValue: (value: unknown) => typeof value === 'number',
    getFreshValue: async () => {
      // couldn't figure out how to do this in one query with out $queryRaw 🤷‍♂️
      type CountResult = [{count: BigInt}]
      const [userIdCount, clientIdCount] = await Promise.all([
        prisma.$queryRaw`SELECT COUNT(DISTINCT "public"."PostRead"."userId") FROM "public"."PostRead" WHERE ("public"."PostRead"."userId") IS NOT NULL` as Promise<CountResult>,
        prisma.$queryRaw`SELECT COUNT(DISTINCT "public"."PostRead"."clientId") FROM "public"."PostRead" WHERE ("public"."PostRead"."clientId") IS NOT NULL` as Promise<CountResult>,
      ]).catch(() => [[{count: BigInt(0)}], [{count: BigInt(0)}]])
      return Number(userIdCount[0].count) + Number(clientIdCount[0].count)
    },
  })
}

export type ReadRankings = Await<ReturnType<typeof getBlogReadRankings>>

async function getBlogReadRankings({
  slug,
  request,
  forceFresh,
}: {
  slug?: string
  request?: Request
  forceFresh?: boolean
}) {
  const key = slug ? `blog:${slug}:rankings` : `blog:rankings`
  const rankingObjs = await cachified({
    key,
    cache,
    ttl: slug ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60,
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    forceFresh: await shouldForceFresh({forceFresh, request, key}),
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
          const activeMembers = await getActiveMembers(team)
          const recentReads = await getRecentReads(slug, team)
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
}: {
  request?: Request
  forceFresh?: boolean
}) {
  const key = 'all-blog-post-read-rankings'
  return cachified({
    key,
    cache,
    forceFresh: await shouldForceFresh({forceFresh, request, key}),
    ttl: 1000 * 60 * 5, // the underlying caching should be able to handle this every 5 minues
    staleWhileRevalidate: 1000 * 60 * 60 * 24,
    getFreshValue: async () => {
      const posts = await getBlogMdxListItems({request})
      const {default: pLimit} = await import('p-limit')

      // each of the getBlogReadRankings calls results in 9 postgres queries
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
            })
          }),
        ),
      )
      return allPostReadRankings
    },
  })
}

async function getRecentReads(slug: string | undefined, team: Team) {
  const withinTheLastSixMonths = subMonths(new Date(), 6)

  const count = await prisma.postRead.count({
    where: {
      postSlug: slug,
      createdAt: {gt: withinTheLastSixMonths},
      user: {team},
    },
  })
  return count
}

async function getActiveMembers(team: Team) {
  const withinTheLastYear = subYears(new Date(), 1)

  const count = await prisma.user.count({
    where: {
      team,
      postReads: {
        some: {
          createdAt: {gt: withinTheLastYear},
        },
      },
    },
  })

  return count
}

async function getSlugReadsByUser(request: Request) {
  const user = await getUser(request)
  if (!user) return []
  const reads = await prisma.postRead.findMany({
    where: {userId: user.id},
    select: {postSlug: true},
  })
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
