import type {Team} from 'types'
import {subYears, subMonths} from 'date-fns'
import {getBlogMdxListItems} from './mdx'
import {prisma} from './prisma.server'
import {teams} from './misc'

async function getBlogRecommendations() {
  const posts = await getBlogMdxListItems()

  return posts
}

async function getBlogReadRankings(slug: string) {
  type RankingData = {
    totalReads: number
    ranking: number
  }
  const entries = await Promise.all(
    teams.map(async function getRankingsForTeam(
      team,
    ): Promise<readonly [Team, RankingData]> {
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
        ranking = Number((recentReads / activeMembers).toFixed(0))
      }
      return [team, {totalReads, ranking}] as const
    }),
  )

  // TypeScript isn't very smart with Object.fromEntries (or something),
  // so we have to cast the type explicitly
  return Object.fromEntries(entries) as Record<Team, RankingData>
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
