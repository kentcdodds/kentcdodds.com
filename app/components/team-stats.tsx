import * as React from 'react'
import {motion} from 'framer-motion'
import clsx from 'clsx'
import type {Team} from '@prisma/client'
import {useOptionalUserInfo, useTeam} from '../utils/providers'
import {alexProfiles} from '../images'

const barColors: Record<Team, string> = {
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
  const info = useOptionalUserInfo()
  const [currentTeam] = useTeam()
  const avatar = info ? info.avatar : alexProfiles[team]
  const isUsersTeam = team === currentTeam

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
          initial: {width: 8 + 24 * percent, height: 16, padding: 0},
          hover: {width: 72, height: 36, padding: '0 .5rem'},
        }}
        className={clsx(
          'z-10 flex items-center justify-end bg-black rounded-l-md origin-right',
          barColors[team],
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

      {isUsersTeam ? (
        <motion.div
          className="absolute top-1/2 hidden bg-team-current rounded-md lg:block"
          variants={{
            initial: {
              width: 22,
              height: 22,
              y: '-50%',
              x: 40,
              padding: 2,
              borderRadius: 4,
            },
            hover: {
              width: 36,
              height: 36,
              y: '-50%',
              x: 84,
              padding: 3,
              borderRadius: 8,
            },
          }}
        >
          <motion.img
            variants={{
              initial: {borderWidth: 2, borderRadius: 4 - 2},
              hover: {borderWidth: 4, borderRadius: 8 - 3},
            }}
            className="w-full h-full border-2 dark:border-gray-900 border-white object-cover"
            src={avatar.src}
            alt={avatar.alt}
          />
        </motion.div>
      ) : null}
    </motion.button>
  )
}

function TeamStats({rankings}: {rankings: Array<ReadRanking>}) {
  // sort rankings to be [second, first, last], just like contest stages, but
  // reversed due to orientation. Sorting on ranking 1, 2, 3, results in stair like
  // structures, which doesn't look pretty
  const resorted = [rankings[2], rankings[0], rankings[1]] as Array<ReadRanking>

  return (
    <div className="fixed z-40 left-1/2 top-1/2 mx-auto w-full max-w-8xl transform -translate-x-1/2 -translate-y-1/2">
      <ul className="absolute right-1 top-0 py-4 border-r border-team-current transform -translate-y-1/2 md:right-4">
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
