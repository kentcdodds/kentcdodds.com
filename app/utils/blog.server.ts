import type {Team, Request, MdxListItem} from '~/types'
import {subYears, subMonths} from 'date-fns'
import {shuffle} from 'lodash'
import {getBlogMdxListItems} from './mdx'
import {prisma} from './prisma.server'
import {teams, typedBoolean} from './misc'
import {getSession} from './session.server'
import {filterPosts} from './blog'
import {getClientSession} from './client.server'

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

  if (limit === null) return shuffle(allPosts)

  const session = await getSession(request)
  const client = await getClientSession(request)
  const clientId = client.getClientId()
  const user = await session.getUser()
  const where = user ? {user: {id: user.id}} : {clientId}
  const readPosts = await prisma.postRead.groupBy({
    by: ['postSlug'],
    where,
  })

  // exclude what they want us to + any posts the user has already read
  let exclude = Array.from(
    new Set(
      ...externalExclude,
      readPosts.map(p => p.postSlug),
    ),
  )
  const posts = allPosts.filter(post => !exclude.includes(post.slug))

  const recommendations: Array<MdxListItem> = []
  // if no keywords were given, then we won't have a group for best match
  // so there will only be two groups
  const groupsCount = keywords.length ? 3 : 2
  const limitPerGroup = Math.floor(limit / groupsCount) || 1

  if (keywords.length) {
    // get best match posts
    const postsByBestMatch = keywords.length
      ? Array.from(new Set(...keywords.map(k => filterPosts(posts, k))))
      : posts
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
      .map(slug => allPosts.find(({slug: s}) => s === slug))
      .filter(typedBoolean),
  ).slice(0, limitPerGroup)
  recommendations.push(...mostPopularRecommendations)
  exclude = [...exclude, ...mostPopularRecommendationSlugs]

  if (recommendations.length < limit) {
    // fill in the rest with random posts
    const remainingPosts = allPosts.filter(({slug}) => !exclude.includes(slug))
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

async function getTotalPostReads(slug?: string) {
  const count = await prisma.postRead.count({
    where: {postSlug: slug},
  })

  return count
}

async function getReaderCount() {
  // couldn't figure out how to do this in one query with out $queryRaw 🤷‍♂️
  type CountResult = [{count: number}]
  const [userIdCount, clientIdCount] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(DISTINCT "public"."PostRead"."userId") FROM "public"."PostRead" WHERE ("public"."PostRead"."userId") IS NOT NULL` as Promise<CountResult>,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "public"."PostRead"."clientId") FROM "public"."PostRead" WHERE ("public"."PostRead"."clientId") IS NOT NULL` as Promise<CountResult>,
  ]).catch(() => [[{count: 0}], [{count: 0}]])
  return userIdCount[0].count + clientIdCount[0].count
}

async function getBlogReadRankings(slug?: string) {
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
        ranking = Number(recentReads / activeMembers)
      }
      return {team, totalReads, ranking}
    }),
  )
  const rankings = rawRankingData.map(r => r.ranking)
  const maxRanking = Math.max(...rankings)
  const minRanking = Math.min(...rankings)
  const rankPercentages = rawRankingData
    .map(({team, totalReads, ranking}) => {
      return {
        team,
        totalReads,
        ranking,
        percent: Number(
          ((ranking - minRanking) / (maxRanking - minRanking || 1)).toFixed(2),
        ),
      }
    })
    // if they're the same, then we'll randomize their relative order.
    // Otherwise, it's greatest to smallest
    .sort(({percent: a}, {percent: b}) =>
      b === a ? (Math.random() > 0.5 ? -1 : 1) : a > b ? -1 : 1,
    )

  return rankPercentages
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

export {
  getBlogRecommendations,
  getBlogReadRankings,
  getTotalPostReads,
  getReaderCount,
}
