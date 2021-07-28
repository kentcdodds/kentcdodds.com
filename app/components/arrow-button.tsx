import * as React from 'react'
import clsx from 'clsx'
import {Link, LinkProps} from 'react-router-dom'
import {motion, Variant} from 'framer-motion'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'
import {H6} from './typography'
import {ElementState, useElementState} from './hooks/use-element-state'

const arrowVariants: Record<
  ArrowIconProps['direction'],
  Record<ElementState, Variant>
> = {
  down: {
    initial: {y: 0},
    hover: {y: 8},
    focus: {
      y: [0, 8, 0],
      transition: {repeat: Infinity},
    },
    active: {y: 24},
  },
  up: {
    initial: {y: 0},
    hover: {y: -8},
    focus: {
      y: [0, -8, 0],
      transition: {repeat: Infinity},
    },
    active: {y: -24},
  },
  left: {
    initial: {x: 0},
    hover: {x: -8},
    focus: {
      x: [0, -8, 0],
      transition: {repeat: Infinity},
    },
    active: {x: -24},
  },
  right: {
    initial: {x: 0},
    hover: {x: 8},
    focus: {
      x: [0, 8, 0],
      transition: {repeat: Infinity},
    },
    active: {x: 24},
  },
  'top-right': {
    initial: {x: 0, y: 0},
    hover: {x: 8, y: -8},
    focus: {
      x: [0, 8, 0],
      y: [0, -8, 0],
      transition: {repeat: Infinity},
    },
    active: {x: 24, y: -24},
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
        <span className="mr-8 text-xl font-medium">{children}</span>
      ) : null}

      <div className="relative inline-flex flex-none items-center justify-center p-1 w-14 h-14">
        <div className="absolute text-gray-200 dark:text-gray-600">
          <svg width="60" height="60">
            <circle
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
              style={{strokeDasharray, rotate: -90}}
              variants={{
                initial: {strokeDashoffset: circumference},
                hover: {strokeDashoffset: 0},
                focus: {strokeDashoffset: 0},
                active: {strokeDashoffset: 0},
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
        <span className="ml-8 text-xl font-medium">{children}</span>
      ) : null}
    </>
  )
}

function ArrowButton({onClick, type, ...props}: ArrowButtonProps) {
  const [ref, state] = useElementState()

  return (
    <motion.button
      onClick={onClick}
      type={type}
      {...getBaseProps(props)}
      ref={ref}
      animate={state}
    >
      <ArrowButtonContent {...props} />
    </motion.button>
  )
}

const MotionLink = motion(Link)

function ArrowLink({to, ...props}: ArrowLinkProps) {
  const [ref, state] = useElementState()

  if (typeof to === 'string' && (to.startsWith('http') || to.startsWith('#'))) {
    return (
      <motion.a href={to} {...getBaseProps(props)} ref={ref} animate={state}>
        <ArrowButtonContent {...props} />
      </motion.a>
    )
  }

  return (
    <MotionLink to={to} {...getBaseProps(props)} ref={ref} animate={state}>
      <ArrowButtonContent {...props} />
    </MotionLink>
  )
}

function BackLink({
  to,
  className,
  children,
}: Pick<ArrowLinkProps, 'to' | 'className' | 'children'>) {
  const [ref, state] = useElementState()
  return (
    <MotionLink
      to={to}
      className={clsx(
        'text-primary flex focus:outline-none space-x-4',
        className,
      )}
      ref={ref}
      animate={state}
    >
      <motion.span variants={arrowVariants.left}>
        <ArrowIcon direction="left" />
      </motion.span>
      <H6 as="span">{children}</H6>
    </MotionLink>
  )
}

export {ArrowButton, ArrowLink, BackLink}
