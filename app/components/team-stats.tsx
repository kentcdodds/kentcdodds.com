import * as React from 'react'
import {motion} from 'framer-motion'
import clsx from 'clsx'
import {useOptionalUserInfo, useTeam} from '../utils/providers'
import {alexProfiles} from '../images'
import type {Team} from '@prisma/client'

const dotColors: Record<Team, string> = {
  RED: 'bg-team-red',
  YELLOW: 'bg-team-yellow',
  BLUE: 'bg-team-blue',
}

type ReadRanking = {
  totalReads: number
  team: Team
  percent: number
}

function Stat({totalReads, team}: ReadRanking) {
  const info = useOptionalUserInfo()
  const [currentTeam] = useTeam()
  const avatar = info ? info.avatar : alexProfiles[team]
  const isUsersTeam = team === currentTeam

  const dotSize = isUsersTeam ? 28 : 16

  return (
    <motion.li
      initial="initial"
      whileHover="hover"
      whileFocus="hover"
      className="flex items-center justify-end origin-right"
      tabIndex={0}
      variants={{
        initial: {
          height: 36,
          x: isUsersTeam ? 6 : 0,
        },
        hover: {
          height: 72,
          x: 0,
        },
      }}
    >
      <motion.div
        variants={{
          initial: {opacity: 0, x: dotSize, height: 16, lineHeight: '8px'},
          hover: {opacity: 1, x: -16, height: 56, lineHeight: '28px'},
        }}
        className="text-primary bg-primary px-8 py-3 text-lg font-medium border-2 border-gray-200 dark:border-gray-600 rounded-full"
      >
        {new Intl.NumberFormat().format(totalReads)}
      </motion.div>

      <motion.div
        variants={{
          initial: {width: dotSize, height: dotSize},
          hover: {width: 56, height: 56},
        }}
        className={clsx(
          'z-10 flex items-center justify-center bg-black rounded-full origin-right',
          dotColors[team],
        )}
      >
        {isUsersTeam ? (
          <motion.img
            variants={{
              initial: {width: 22, height: 22, borderWidth: 0},
              hover: {width: 50, height: 50, borderWidth: 5},
            }}
            className="inline border dark:border-gray-800 border-white rounded-full object-cover"
            src={avatar.src}
            alt={avatar.alt}
          />
        ) : null}
      </motion.div>
    </motion.li>
  )
}

function TeamStats({rankings}: {rankings: Array<ReadRanking>}) {
  const resorted = [rankings[1], rankings[0], rankings[2]] as Array<ReadRanking>

  return (
    <ul className="fixed z-50 right-4 top-1/2 transform -translate-y-1/2 md:right-8">
      {resorted.map(ranking => (
        <Stat key={ranking.team} {...ranking} />
      ))}
    </ul>
  )
}

export {TeamStats}
