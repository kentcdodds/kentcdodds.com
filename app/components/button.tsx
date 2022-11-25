import clsx from 'clsx'
import * as React from 'react'
import {AnchorOrLink} from '~/utils/misc'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
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
  size = 'large',
}: Pick<ButtonProps, 'children' | 'variant' | 'size'>) {
  return (
    <>
      <div
        className={clsx(
          'focus-ring absolute inset-0 transform rounded-full opacity-100 transition disabled:opacity-50',
          {
            'border-secondary bg-primary border-2 group-hover:border-transparent group-focus:border-transparent':
              variant === 'secondary' || variant === 'danger',
            danger: variant === 'danger',
            'bg-inverse': variant === 'primary',
          },
        )}
      />

      <div
        className={clsx(
          'relative flex h-full w-full items-center justify-center whitespace-nowrap',
          {
            'text-primary': variant === 'secondary',
            'text-inverse': variant === 'primary',
            'text-red-500': variant === 'danger',
            'space-x-5 px-11 py-6': size === 'large',
            'space-x-3 px-8 py-4': size === 'medium',
            'space-x-1 px-5 py-2 text-sm': size === 'small',
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

/**
 * A button that looks like a link
 */
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
        className?.includes('block') ? '' : 'inline-block',
        'text-primary',
      )}
    />
  )
}

/**
 * A link that looks like a button
 */
const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithRef<typeof AnchorOrLink> & ButtonProps
>(function ButtonLink(
  {children, variant = 'primary', className, ...rest},
  ref,
) {
  return (
    <AnchorOrLink ref={ref} className={getClassName({className})} {...rest}>
      <ButtonInner variant={variant}>{children}</ButtonInner>
    </AnchorOrLink>
  )
})

export {Button, ButtonLink, LinkButton}
