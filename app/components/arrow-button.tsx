import * as React from 'react'
import clsx from 'clsx'
import {Link, LinkProps} from 'react-router-dom'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'

interface ArrowButtonProps {
  children: React.ReactNode
  direction?: ArrowIconProps['direction']
  textSize?: 'small' | 'medium'
  className?: string
}

function ArrowButton({
  children,
  direction = 'right',
  textSize = 'medium',
  className,
  ...buttonProps
}: ArrowButtonProps & JSX.IntrinsicElements['button']) {
  return (
    <button
      className={clsx(
        'inline-flex items-center text-black dark:text-white font-medium transition',
        {
          'text-xl': textSize === 'medium',
          'text-lg': textSize === 'small',
        },
        className,
      )}
      {...buttonProps}
    >
      {direction === 'right' || direction === 'up' ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <span className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <ArrowIcon direction={direction} />
      </span>

      {direction === 'left' || direction === 'down' ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </button>
  )
}

function ArrowLink({
  children,
  direction = 'right',
  textSize = 'medium',
  ...linkProps
}: ArrowButtonProps & LinkProps) {
  return (
    <Link
      className={clsx(
        'inline-flex items-center text-black dark:text-white font-medium transition',
        {
          'text-xl': textSize === 'medium',
          'text-lg': textSize === 'small',
        },
      )}
      {...linkProps}
    >
      {direction === 'right' || direction === 'up' ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <span className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <ArrowIcon direction={direction} />
      </span>

      {direction === 'left' || direction === 'down' ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </Link>
  )
}

export {ArrowButton, ArrowLink}
