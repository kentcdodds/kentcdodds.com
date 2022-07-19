import * as React from 'react'
import clsx from 'clsx'

type TitleProps = {
  variant?: 'primary' | 'secondary'
  as?: React.ElementType
  className?: string
  id?: string
} & (
  | {children: React.ReactNode}
  | {
      dangerouslySetInnerHTML: {
        __html: string
      }
    }
)

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
  secondary: 'text-gray-400 dark:text-slate-500',
}

function Title({
  variant = 'primary',
  size,
  as,
  className,
  ...rest
}: TitleProps & {size: keyof typeof fontSize}) {
  const Tag = as ?? size
  return (
    <Tag
      className={clsx(fontSize[size], titleColors[variant], className)}
      {...rest}
    />
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

type ParagraphProps = {
  className?: string
  prose?: boolean
  textColorClassName?: string
  as?: React.ElementType
} & ({children: React.ReactNode} | {dangerouslySetInnerHTML: {__html: string}})

function Paragraph({
  className,
  prose = true,
  as = 'p',
  textColorClassName = 'text-secondary',
  ...rest
}: ParagraphProps) {
  return React.createElement(as, {
    className: clsx('max-w-full text-lg', textColorClassName, className, {
      'prose prose-light dark:prose-dark': prose,
    }),
    ...rest,
  })
}

export {H1, H2, H3, H4, H5, H6, Paragraph}
