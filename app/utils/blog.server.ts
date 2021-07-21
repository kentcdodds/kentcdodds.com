import type {Team} from 'types'
import {subYears, subMonths} from 'date-fns'
import {getBlogMdxListItems} from './mdx'
import {prisma} from './prisma.server'
import {teams} from './misc'

async function getBlogRecommendations({limit}: {limit?: number} = {}) {
  const posts = await getBlogMdxListItems()

  if (typeof limit !== 'undefined') {
    return posts
  }

  return posts.slice(0, limit)
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
