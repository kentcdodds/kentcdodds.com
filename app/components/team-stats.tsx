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

function Stat({
  totalReads,
  team,
  percent,
  direction,
}: ReadRanking & {direction: 'up' | 'down'}) {
  const info = useOptionalUserInfo()
  const [currentTeam] = useTeam()
  const avatar = info ? info.avatar : alexProfiles[team]
  const isUsersTeam = team === currentTeam

  return (
    <motion.div
      tabIndex={0}
      initial="initial"
      whileHover="hover"
      whileFocus="hover"
      className="relative flex items-center justify-center focus:outline-none origin-right"
      variants={{
        initial: {width: 22},
      }}
    >
      <motion.div
        variants={{
          initial: {
            height: 12 + 24 * percent,
            width: 16,
            y: direction === 'up' ? '-100%' : 0,
          },
          hover: {height: 48, width: 24},
        }}
        className={clsx(
          'relative flex justify-center',
          {
            'rounded-t-md': direction === 'up',
            'rounded-b-md': direction === 'down',
          },
          barColors[team],
        )}
      >
        <motion.span
          variants={{
            initial: {opacity: 0, scale: 1, y: 0, fontSize: 0},
            hover: {
              opacity: 1,
              scale: 1,
              y: direction === 'up' ? '-100%' : '100%',
              fontSize: '18px',
            },
          }}
          className={clsx('text-primary absolute text-lg font-medium', {
            'bottom-0': direction === 'down',
            'top-0': direction === 'up',
          })}
        >
          {new Intl.NumberFormat().format(totalReads)}
        </motion.span>
      </motion.div>

      {isUsersTeam ? (
        <motion.div
          className="absolute left-1/2 top-0 border-team-current rounded-md"
          variants={{
            initial: {
              width: 22,
              height: 22,
              x: '-50%',
              y: direction === 'up' ? 4 : -26,
              borderWidth: 2,
              borderRadius: 4,
            },
            hover: {
              width: 36,
              height: 36,
              x: '-50%',
              y: direction === 'up' ? 6 : -42,
              borderWidth: 3,
              borderRadius: 8,
            },
          }}
        >
          <motion.img
            variants={{
              initial: {borderWidth: 2, borderRadius: 4 - 2},
              hover: {borderWidth: 4, borderRadius: 8 - 3},
            }}
            className="w-full h-full dark:border-gray-900 border-white object-cover"
            src={avatar.src}
            alt={avatar.alt}
          />
        </motion.div>
      ) : null}
    </motion.div>
  )
}

function TeamStats({
  rankings,
  direction = 'up',
}: {
  rankings: Array<ReadRanking>
  direction: 'up' | 'down'
}) {
  // sort rankings to be [second, first, last], just like contest stages, but
  // reversed due to orientation. Sorting on ranking 1, 2, 3, results in stair like
  // structures, which doesn't look pretty
  const resorted = [rankings[2], rankings[0], rankings[1]] as Array<ReadRanking>

  return (
    <div
      className={clsx('group relative inline-flex flex-col justify-end', {
        'justify-end': direction === 'down',
        'justify-start': direction === 'up',
      })}
    >
      <div
        className={clsx(
          'underlined absolute right-0 h-8 text-sm opacity-0 group-hover:opacity-100 transition',
          {
            '-top-8': direction === 'down',
            '-bottom-20': direction === 'up',
          },
        )}
      >
        <a
          className="text-secondary hover:text-primary underlined"
          href="{/* TODO: add correct url */}"
        >
          what's this?
        </a>
      </div>
      <ul
        className={clsx(
          'relative flex px-4 h-0 border-team-current overflow-visible',
          {
            'border-t': direction === 'down',
            'border-b': direction === 'up',
          },
        )}
      >
        {resorted.map(ranking => (
          <li key={ranking.team} className="h-0 overflow-visible">
            <Stat direction={direction} {...ranking} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export {TeamStats}
