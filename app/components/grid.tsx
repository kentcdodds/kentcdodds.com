import * as React from 'react'
import clsx from 'clsx'
import type {ReactNode} from 'react'

interface GridProps {
  children: ReactNode
  overflow?: boolean
  className?: string
}

function Grid({children, className}: GridProps) {
  return (
    <div
      className={clsx(
        'gap-[18px] mx-[10vw] md:gap-[17px] lg:gap-[23px] grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Use for development only! It renders the grid columns and gaps as page overlay
 */
function GridLines() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('<GridLines />  should only be used during development')
  }

  return (
    <div className="-z-10 fixed inset-0 pointer-events-none select-none">
      <Grid>
        {Array.from({length: 12}).map((_, idx) => (
          <div
            key={idx}
            className="bg-opacity-[0.025] dark:bg-opacity-[0.025] flex items-start h-screen text-black dark:text-white bg-black dark:bg-white"
          >
            <div className="pt-4 w-full text-center text-black dark:text-white text-lg opacity-10">
              {idx + 1}
            </div>
          </div>
        ))}
      </Grid>
    </div>
  )
}

export {Grid, GridLines}
