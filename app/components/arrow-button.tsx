import * as React from 'react'
import clsx from 'clsx'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'

interface ArrowButtonProps {
  children: React.ReactNode
  direction?: ArrowIconProps['direction']
  textSize?: 'small' | 'medium'
}

function ArrowButton({
  children,
  direction = 'right',
  textSize = 'medium',
}: ArrowButtonProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center text-black dark:text-white font-medium transition',
        {
          'text-xl': textSize === 'medium',
          'text-lg': textSize === 'small',
        },
      )}
    >
      {direction === 'right' || direction === 'up' ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <div className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <ArrowIcon direction={direction} />
      </div>

      {direction === 'left' || direction === 'down' ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </div>
  )
}

export {ArrowButton}
