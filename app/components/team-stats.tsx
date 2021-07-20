import * as React from 'react'
import {motion} from 'framer-motion'
import clsx from 'clsx'
import type {Team} from '@prisma/client'

const rankingColors: Record<Team, string> = {
  RED: 'bg-team-red',
  YELLOW: 'bg-team-yellow',
  BLUE: 'bg-team-blue',
}

type ReadRanking = {
  totalReads: number
  team: Team
  percent: number
}

function Stat({totalReads, team, percent}: ReadRanking) {
  return (
    <motion.button
      initial="initial"
      whileHover="hover"
      whileFocus="hover"
      className="relative focus:outline-none origin-right"
      variants={{
        initial: {height: 22},
        hover: {height: 38},
      }}
      transition={{duration: 0.2}}
    >
      <motion.div
        variants={{
          initial: {width: 16 + 12 * percent, height: 16},
          hover: {width: 72, height: 36},
        }}
        className={clsx(
          'z-10 flex items-center justify-end px-2 bg-black rounded-l-md origin-right',
          rankingColors[team],
        )}
      >
        <motion.span
          variants={{
            initial: {opacity: 0, scale: 0.5},
            hover: {opacity: 1, scale: 1},
          }}
          className="text-gray-900 text-lg font-medium"
        >
          {new Intl.NumberFormat().format(totalReads)}
        </motion.span>
      </motion.div>
    </motion.button>
  )
}

function TeamStats({rankings}: {rankings: Array<ReadRanking>}) {
  // sort rankings to be [second, first, last], just like contest stages, but
  // reversed due to orientation. Sorting on ranking 1, 2, 3, results in stair like
  // structures, which doesn't look pretty
  const resorted = [rankings[2], rankings[0], rankings[1]] as Array<ReadRanking>

  return (
    <div className="fixed z-40 right-2 top-1/2 transform -translate-y-1/2 md:right-8">
      <ul className="py-4 border-r border-team-current">
        {resorted.map(ranking => (
          <li key={ranking.team} className="flex items-center justify-end">
            <Stat {...ranking} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export {TeamStats}
