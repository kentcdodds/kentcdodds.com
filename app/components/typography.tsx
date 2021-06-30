import * as React from 'react'
import clsx from 'clsx'

interface TitleProps {
  variant?: 'primary' | 'secondary'
  as?: React.ElementType
  children: React.ReactNode
  className?: string
}

const fontSize = {
  h1: 'leading-tight text-4xl md:text-5xl',
  h2: 'leading-tight text-3xl md:text-4xl',
  h3: 'text-2xl font-medium md:text-3xl',
  h4: 'text-xl font-medium md:text-2xl',
  h5: 'text-lg font-medium md:text-xl',
  h6: 'text-lg font-medium',
}

const titleColors = {
  primary: 'text-black dark:text-white',
  secondary: 'text-gray-400 dark:text-blueGray-500',
}

function Title({
  variant = 'primary',
  size,
  as,
  children,
  className,
}: TitleProps & {size: keyof typeof fontSize}) {
  const Tag = as ?? size
  return (
    <Tag className={clsx(fontSize[size], titleColors[variant], className)}>
      {children}
    </Tag>
  )
}

function H1(props: TitleProps) {
  return <Title {...props} size="h1" />
}

function H2(props: TitleProps) {
  return <Title {...props} size="h2" />
}

function H3(props: TitleProps) {
  return <Title {...props} size="h3" />
}

function H4(props: TitleProps) {
  return <Title {...props} size="h4" />
}

function H5(props: TitleProps) {
  return <Title {...props} size="h5" />
}

function H6(props: TitleProps) {
  return <Title {...props} size="h6" />
}

interface ParagraphProps {
  children: string
}

function Paragraph({children}: ParagraphProps) {
  return (
    <p className="dark:text-blueGray-500 text-gray-500 text-lg">{children}</p>
  )
}

export {H1, H2, H3, H4, H5, H6, Paragraph}
