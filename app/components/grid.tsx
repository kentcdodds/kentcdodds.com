import * as React from 'react'
import clsx from 'clsx'

interface GridProps {
  children: React.ReactNode
  overflow?: boolean
  className?: string
  as?: React.ElementType
  nested?: boolean
  rowGap?: boolean
  featured?: boolean
}

function Grid({
  children,
  className,
  as: Tag = 'div',
  featured,
  nested,
  rowGap,
}: GridProps) {
  return (
    <Tag
      className={clsx('relative', {
        'mx-10vw': !nested,
        'w-full': nested,
        'py-10 md:py-24 lg:pb-40 lg:pt-36': featured,
      })}
    >
      {featured ? (
        <div className="absolute inset-0 -mx-5vw">
          <div className="bg-secondary mx-auto w-full max-w-8xl h-full rounded-lg" />
        </div>
      ) : null}

      <div
        className={clsx(
          'relative grid gap-x-4 grid-cols-4 md:grid-cols-8 lg:gap-x-6 lg:grid-cols-12',
          {
            'mx-auto max-w-7xl': !nested,
            'gap-y-4 lg:gap-y-6': rowGap,
          },
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
  if (ENV.NODE_ENV !== 'development') {
    throw new Error('<GridLines />  should only be used during development')
  }

  return (
    <div className="fixed z-10 inset-0 pointer-events-none select-none">
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
