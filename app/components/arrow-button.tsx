import * as React from 'react'
import clsx from 'clsx'
import {Link, LinkProps} from 'react-router-dom'
import {motion} from 'framer-motion'
import {ArrowIcon, ArrowIconProps} from './icons/arrow-icon'

interface ArrowButtonProps {
  children?: React.ReactNode
  direction?: ArrowIconProps['direction']
  textSize?: 'small' | 'medium'
  className?: string
}

function ArrowButton({
  children,
  direction = 'right',
  textSize = 'medium',
  className,
  ...buttonProps
}: ArrowButtonProps & JSX.IntrinsicElements['button']) {
  return (
    <button
      className={clsx(
        'inline-flex items-center text-black dark:text-white font-medium transition',
        {
          'text-xl': textSize === 'medium',
          'text-lg': textSize === 'small',
        },
        className,
      )}
      {...buttonProps}
    >
      {children && (direction === 'right' || direction === 'up') ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <span className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <ArrowIcon direction={direction} />
      </span>

      {children && (direction === 'left' || direction === 'down') ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </button>
  )
}

const arrowVariants = {
  initial: {
    x: 0,
  },
  hover: {
    x: 8,
  },
  tap: {
    x: 24,
  },
}

const MotionLink = motion(Link)

function ArrowLink({
  children,
  direction = 'right',
  textSize = 'medium',
  to,
}: ArrowButtonProps & Pick<LinkProps, 'to'>) {
  return (
    <MotionLink
      className={clsx(
        'text-primary inline-flex items-center font-medium cursor-pointer transition',
        {
          'text-xl': textSize === 'medium',
          'text-lg': textSize === 'small',
        },
      )}
      to={to}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate="initial"
    >
      {direction === 'right' || direction === 'up' ? (
        <span className="mr-8">{children}</span>
      ) : null}

      <span className="inline-flex flex-none items-center justify-center p-1 w-14 h-14 border-2 border-gray-200 dark:border-gray-600 rounded-full transition">
        <motion.span variants={arrowVariants}>
          <ArrowIcon direction={direction} />
        </motion.span>
      </span>

      {direction === 'left' || direction === 'down' ? (
        <span className="ml-8">{children}</span>
      ) : null}
    </MotionLink>
  )
}

export {ArrowButton, ArrowLink}
