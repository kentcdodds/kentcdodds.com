import clsx from 'clsx'
import * as React from 'react'
import {AnchorOrLink} from '~/utils/misc'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
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
              variant === 'secondary' || variant === 'danger',
            danger: variant === 'danger',
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
            'text-red-500': variant === 'danger',
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

function LinkButton({
  className,
  underlined,
  ...buttonProps
}: {underlined?: boolean} & JSX.IntrinsicElements['button']) {
  return (
    <button
      {...buttonProps}
      className={clsx(
        className,
        underlined
          ? 'underlined whitespace-nowrap focus:outline-none'
          : 'underline',
        'text-primary inline-block',
      )}
    />
  )
}

const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  ButtonProps & {to: string} & Pick<
      JSX.IntrinsicElements['a'],
      'onClick' | 'className' | 'download'
    >
>(function ButtonLink(
  {children, variant = 'primary', className, download, to, onClick},
  ref,
) {
  return (
    <AnchorOrLink
      ref={ref}
      href={to}
      onClick={onClick}
      download={download}
      className={getClassName({className})}
    >
      <ButtonInner variant={variant}>{children}</ButtonInner>
    </AnchorOrLink>
  )
})

export {Button, ButtonLink, LinkButton}
