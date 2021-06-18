import type {ReactNode} from 'react'
import clsx from 'clsx'
import * as React from 'react'

interface TitleProps {
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

const titleColors = {
  primary: 'text-black dark:text-white',
  secondary: 'text-gray-400 dark:text-blueGray-500',
}

function H1({variant = 'primary', children}: TitleProps) {
  return (
    <h1
      className={clsx(
        'leading-[42px] md:leading-[60px] text-4xl md:text-5xl',
        titleColors[variant],
      )}
    >
      {children}
    </h1>
  )
}

function H2({variant = 'primary', children}: TitleProps) {
  return (
    <h2
      className={clsx(
        'leading-[38px] md:leading-[50px] text-3xl md:text-4xl',
        titleColors[variant],
      )}
    >
      {children}
    </h2>
  )
}

function H3({variant = 'primary', children}: TitleProps) {
  return (
    <h3
      className={clsx('text-2xl font-medium md:text-3xl', titleColors[variant])}
    >
      {children}
    </h3>
  )
}

function H4({variant = 'primary', children}: TitleProps) {
  return (
    <h4
      className={clsx('text-xl font-medium md:text-2xl', titleColors[variant])}
    >
      {children}
    </h4>
  )
}

function H5({variant = 'primary', children}: TitleProps) {
  return (
    <h5
      className={clsx('text-lg font-medium md:text-xl', titleColors[variant])}
    >
      {children}
    </h5>
  )
}

function H6({variant = 'primary', children}: TitleProps) {
  return (
    <h6 className={clsx('text-lg font-medium', titleColors[variant])}>
      {children}
    </h6>
  )
}
export {H1, H2, H3, H4, H5, H6}
