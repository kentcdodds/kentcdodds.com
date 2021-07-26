import * as React from 'react'
import clsx from 'clsx'
import {Link, LinkProps} from 'react-router-dom'
import {motion} from 'framer-motion'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'
import {H6} from './typography'

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

// whileFocus takes precedence over whileTap, so while we can't move the arrow
// on focus (or on tap), we can still color and animate the circle.
// See: https://github.com/framer/motion/issues/1221
function getBaseProps({textSize, className}: ArrowButtonBaseProps) {
  return {
    className: clsx(
      'text-primary inline-flex items-center text-left font-medium focus:outline-none cursor-pointer transition',
      {
        'text-xl': textSize === 'medium',
        'text-lg': textSize === 'small',
      },
      className,
    ),
    initial: 'initial',
    whileHover: 'hover',
    whileFocus: 'focus',
    whileTap: 'tap',
    animate: 'initial',
  }
}

function ArrowButtonContent({
  children,
  direction = 'right',
}: Pick<ArrowButtonBaseProps, 'children' | 'direction'>) {
  const circumference = 28 * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`

  return (
    <>
      {children &&
      (direction === 'right' ||
        direction === 'up' ||
        direction === 'top-right') ? (
        <span className="text-primary mr-8 text-xl font-medium">
          {children}
        </span>
      ) : null}

      <div className="text-primary relative inline-flex flex-none items-center justify-center p-1 w-14 h-14">
        <div className="absolute text-gray-200 dark:text-gray-600">
          <svg width="60" height="60">
            <motion.circle
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              r="28"
              cx="30"
              cy="30"
            />

            <motion.circle
              className="text-primary"
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              r="28"
              cx="30"
              cy="30"
              style={{strokeDasharray}}
              variants={{
                hover: {strokeDashoffset: 0},
                focus: {strokeDashoffset: 0},
                initial: {strokeDashoffset: circumference, rotate: -90},
              }}
              transition={{damping: 0}}
            />
          </svg>
        </div>

        <motion.span variants={arrowVariants[direction]}>
          <ArrowIcon direction={direction} />
        </motion.span>
      </div>

      {children && (direction === 'left' || direction === 'down') ? (
        <span className="text-primary ml-8 text-xl font-medium">
          {children}
        </span>
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
  if (typeof to === 'string' && (to.startsWith('http') || to.startsWith('#'))) {
    return (
      <motion.a href={to} {...getBaseProps(props)}>
        <ArrowButtonContent {...props} />
      </motion.a>
    )
  }

  return (
    <MotionLink to={to} {...getBaseProps(props)}>
      <ArrowButtonContent {...props} />
    </MotionLink>
  )
}

function BackLink({
  to,
  className,
  children,
}: Pick<ArrowLinkProps, 'to' | 'className' | 'children'>) {
  return (
    <MotionLink
      to={to}
      className={clsx('flex text-black dark:text-white space-x-4', className)}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate="initial"
    >
      <motion.span variants={arrowVariants.left}>
        <ArrowIcon direction="left" />
      </motion.span>
      <H6 as="span">{children}</H6>
    </MotionLink>
  )
}

export {ArrowButton, ArrowLink, BackLink}
