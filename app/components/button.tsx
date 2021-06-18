import type {ReactNode} from 'react'
import clsx from 'clsx'
import * as React from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

function Button({children, variant = 'primary'}: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-11 py-6 whitespace-nowrap text-lg font-medium rounded-full transition',
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

export {Button}
