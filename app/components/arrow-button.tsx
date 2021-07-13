import * as React from 'react'
import clsx from 'clsx'
import {Link, LinkProps} from 'react-router-dom'
import {motion} from 'framer-motion'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'

const arrowVariants: Record<
  ArrowIconProps['direction'],
  Record<string, {x?: number; y?: number}>
> = {
  down: {
    initial: {y: 0},
    hover: {y: 8},
    tap: {y: 24},
  },
  up: {
    initial: {y: 0},
    hover: {y: -8},
    tap: {y: -24},
  },
  left: {
    initial: {x: 0},
    hover: {x: -8},
    tap: {x: -24},
  },
  right: {
    initial: {x: 0},
    hover: {x: 8},
    tap: {x: 24},
  },
  'top-right': {
    initial: {x: 0, y: 0},
    hover: {x: 8, y: -8},
    tap: {x: 24, y: -24},
  },
}

type ArrowButtonBaseProps = {
  direction?: ArrowIconProps['direction']
  children?: React.ReactNode | React.ReactNode[]
  className?: string
  textSize?: 'small' | 'medium'
}

type ArrowLinkProps = {
  to: LinkProps['to']
} & ArrowButtonBaseProps

type ArrowButtonProps = {
  onClick?: JSX.IntrinsicElements['button']['onClick']
  type?: JSX.IntrinsicElements['button']['type']
} & ArrowButtonBaseProps

function getBaseProps({textSize, className}: ArrowButtonBaseProps) {
  return {
    className: clsx(
      'text-primary inline-flex items-center font-medium cursor-pointer transition',
      {
        'text-xl': textSize === 'medium',
        'text-lg': textSize === 'small',
      },
      className,
    ),
    initial: 'initial',
    whileHover: 'hover',
    whileTap: 'tap',
    animate: 'initial',
  }
}

function ArrowButtonContent({
  children,
  direction = 'right',
}: Pick<ArrowButtonBaseProps, 'children' | 'direction'>) {
  return (
    <>
      {direction === 'right' ||
      direction === 'up' ||
      direction === 'top-right' ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <span className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <motion.span variants={arrowVariants[direction]}>
          <ArrowIcon direction={direction} />
        </motion.span>
      </span>

      {direction === 'left' || direction === 'down' ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </>
  )
}

function ArrowButton({onClick, type, ...props}: ArrowButtonProps) {
  return (
    <motion.button onClick={onClick} type={type} {...getBaseProps(props)}>
      <ArrowButtonContent {...props} />
    </motion.button>
  )
}

const MotionLink = motion(Link)
function ArrowLink({to, ...props}: ArrowLinkProps) {
  return (
    <MotionLink to={to} {...getBaseProps(props)}>
      <ArrowButtonContent {...props} />
    </MotionLink>
  )
}

export {ArrowButton, ArrowLink}
