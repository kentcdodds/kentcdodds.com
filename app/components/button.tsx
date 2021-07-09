import clsx from 'clsx'
import * as React from 'react'
import {Link, LinkProps} from 'react-router-dom'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode | React.ReactNode[]
}

function Button({
  children,
  variant = 'primary',
  ...buttonProps
}: ButtonProps & JSX.IntrinsicElements['button']) {
  return (
    <button
      {...buttonProps}
      className={clsx(
        'focus-ring inline-flex items-center justify-center px-11 py-6 whitespace-nowrap text-lg font-medium rounded-full opacity-100 disabled:opacity-50 space-x-5 transition',
        {
          'border-2 dark:border-gray-600 border-gray-200 text-black dark:text-white':
            variant === 'secondary',
          'bg-black text-white dark:bg-white dark:text-black':
            variant === 'primary',
        },
      )}
    >
      {children}
    </button>
  )
}

function ButtonLink({
  children,
  variant = 'primary',
  to,
}: ButtonProps & Pick<LinkProps, 'to'>) {
  return (
    <Link
      to={to}
      className={clsx(
        'focus-ring inline-flex items-center justify-center px-11 py-6 whitespace-nowrap text-lg font-medium rounded-full opacity-100 disabled:opacity-50 space-x-5 transition',
        {
          'border-2 dark:border-gray-600 border-gray-200 text-black dark:text-white':
            variant === 'secondary',
          'bg-black text-white dark:bg-white dark:text-black':
            variant === 'primary',
        },
      )}
    >
      {children}
    </Link>
  )
}

export {Button, ButtonLink}
