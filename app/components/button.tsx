import clsx from 'clsx'
import * as React from 'react'
import {Link, LinkProps} from 'react-router-dom'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode | React.ReactNode[]
}

function getClassName({
  variant,
  className,
}: {
  variant: ButtonProps['variant']
  className?: string
}) {
  return clsx(
    'focus-ring inline-flex items-center justify-center px-11 py-6 whitespace-nowrap text-lg font-medium rounded-full opacity-100 disabled:opacity-50 space-x-5 transition',
    {
      'border-2 dark:border-gray-600 border-gray-200 text-primary bg-primary':
        variant === 'secondary',
      'bg-inverse text-inverse': variant === 'primary',
    },
    className,
  )
}

function Button({
  children,
  variant = 'primary',
  className,
  ...buttonProps
}: ButtonProps & JSX.IntrinsicElements['button']) {
  return (
    <button {...buttonProps} className={getClassName({variant, className})}>
      {children}
    </button>
  )
}

const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps & Pick<LinkProps, 'to' | 'className'>
>(function ButtonLink({children, variant = 'primary', className, to}, ref) {
  return (
    <Link ref={ref} to={to} className={getClassName({variant, className})}>
      {children}
    </Link>
  )
})

export {Button, ButtonLink}
