import clsx from 'clsx'
import * as React from 'react'
import {Link, LinkProps} from 'react-router-dom'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'medium' | 'large'
  children: React.ReactNode | React.ReactNode[]
}

function getClassName({
  variant,
  size,
  className,
}: {
  variant: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}) {
  return clsx(
    'focus-ring inline-flex items-center justify-center whitespace-nowrap text-lg font-medium rounded-full opacity-100 disabled:opacity-50 transition',
    {
      'border-2 dark:border-gray-600 border-gray-200 text-primary bg-primary':
        variant === 'secondary',
      'bg-inverse text-inverse': variant === 'primary',
      'px-11 py-6 space-x-5': size !== 'medium',
      'px-8 py-4 space-x-3': size === 'medium',
    },
    className,
  )
}

function Button({
  children,
  variant = 'primary',
  size = 'large',
  className,
  ...buttonProps
}: ButtonProps & JSX.IntrinsicElements['button']) {
  return (
    <button
      {...buttonProps}
      className={getClassName({variant, size, className})}
    >
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
