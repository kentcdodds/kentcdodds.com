import * as React from 'react'
import clsx from 'clsx'

interface GridProps {
  children: React.ReactNode
  overflow?: boolean
  className?: string
  as?: React.ElementType
}

function Grid({children, className, as = 'div'}: GridProps) {
  const Tag = as

  return (
    <Tag className="mx-10vw">
      <div
        className={clsx(
          'grid gap-x-4 grid-cols-4 mx-auto max-w-7xl md:grid-cols-8 lg:gap-x-6 lg:grid-cols-12',
          className,
        )}
      >
        {children}
      </div>
    </Tag>
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
            className="flex items-start h-screen text-black dark:text-white bg-black dark:bg-white opacity-10"
          >
            <div className="pt-4 w-full text-center text-black dark:text-white text-lg">
              {idx + 1}
            </div>
          </div>
        ))}
      </Grid>
    </div>
  )
}

export {Grid, GridLines}
