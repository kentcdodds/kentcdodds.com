import clsx from 'clsx'
import * as React from 'react'
import {Link, LinkProps} from 'react-router-dom'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'medium' | 'large'
  children: React.ReactNode | React.ReactNode[]
}

function getClassName({className}: {className?: string}) {
  return clsx(
    'group relative inline-flex text-lg font-medium focus:outline-none opacity-100 disabled:opacity-50 transition',
    className,
  )
}

function ButtonInner({
  children,
  variant,
  size,
}: Pick<ButtonProps, 'children' | 'variant' | 'size'>) {
  return (
    <>
      <div
        className={clsx(
          'focus-ring absolute inset-0 rounded-full opacity-100 disabled:opacity-50 transform transition',
          {
            'border-2 border-secondary bg-primary group-hover:border-transparent group-focus:border-transparent':
              variant === 'secondary',
            'bg-inverse': variant === 'primary',
          },
        )}
      />

      <div
        className={clsx(
          'relative flex items-center justify-center w-full h-full whitespace-nowrap',
          {
            'text-primary': variant === 'secondary',
            'text-inverse': variant === 'primary',
            'px-11 py-6 space-x-5': size !== 'medium',
            'px-8 py-4 space-x-3': size === 'medium',
          },
        )}
      >
        {children}
      </div>
    </>
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
    <button {...buttonProps} className={getClassName({className})}>
      <ButtonInner variant={variant} size={size}>
        {children}
      </ButtonInner>
    </button>
  )
}

const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps & Pick<LinkProps, 'to' | 'className' | 'onClick'>
>(function ButtonLink(
  {children, variant = 'primary', className, to, onClick},
  ref,
) {
  if (typeof to === 'string' && (to.startsWith('http') || to.startsWith('#'))) {
    return (
      <a
        ref={ref}
        href={to}
        onClick={onClick}
        className={getClassName({className})}
      >
        <ButtonInner variant={variant}>{children}</ButtonInner>
      </a>
    )
  }

  return (
    <Link
      ref={ref}
      to={to}
      onClick={onClick}
      className={getClassName({className})}
    >
      <ButtonInner variant={variant}>{children}</ButtonInner>
    </Link>
  )
})

export {Button, ButtonLink}
