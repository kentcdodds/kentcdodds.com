import type {Team, Request, MdxListItem} from 'types'
import {subYears, subMonths} from 'date-fns'
import {shuffle, sortBy} from 'lodash'
import {getBlogMdxListItems} from './mdx'
import {prisma} from './prisma.server'
import {teams, typedBoolean} from './misc'
import {getUser} from './session.server'
import {filterPosts} from './blog'

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
  const allPosts = await getBlogMdxListItems()

  if (limit === null) return shuffle(allPosts)

  const user = await getUser(request)
  const readPosts = user
    ? await prisma.postRead.groupBy({
        by: ['postSlug'],
        where: {user: {id: user.id}},
      })
    : []

  // exclude what they want us to + any posts the user has already read
  let exclude = Array.from(
    new Set(
      ...externalExclude,
      readPosts.map(({postSlug}) => postSlug),
    ),
  )
  const posts = allPosts.filter(post => !exclude.includes(post.slug))

  const recommendations: Array<MdxListItem> = []
  const limitPerGroup = Math.floor(limit / 3)

  // get best match posts
  const postsByBestMatch = keywords.length
    ? Array.from(new Set(...keywords.map(k => filterPosts(posts, k))))
    : posts
  const bestMatchRecommendations = shuffle(
    postsByBestMatch.slice(0, limitPerGroup * 4),
  ).slice(0, limitPerGroup)
  recommendations.push(...bestMatchRecommendations)

  exclude = [...exclude, ...bestMatchRecommendations.map(({slug}) => slug)]

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

  // fill in the rest with random posts
  const remainingPosts = allPosts.filter(({slug}) => !exclude.includes(slug))
  const completelyRandomRecommendations = shuffle(remainingPosts).slice(
    0,
    limit - recommendations.length,
  )
  recommendations.push(...completelyRandomRecommendations)

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
    orderBy: {postSlug: 'asc'},
    _count: true,
    // figure out if it's possible to orderBy the count so we can use "take".
    // as it is, we have to get everything, then sort it, then limit it... in JS
    // take: limit,
  })

  const filtered = result.filter(({postSlug}) => !exclude.includes(postSlug))
  const sorted = sortBy(filtered, i => -i._count)

  return sorted.slice(0, limit).map(({postSlug}) => postSlug)
}

async function getBlogReadRankings(slug: string) {
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
        percent: Number(
          ((ranking - minRanking) / (maxRanking - minRanking)).toFixed(2),
        ),
      }
    })
    .sort(({percent: a}, {percent: b}) => b - a)

  return rankPercentages
}

async function getRecentReads(slug: string, team: Team) {
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

export {getBlogRecommendations, getBlogReadRankings}
