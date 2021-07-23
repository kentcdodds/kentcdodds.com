import * as React from 'react'
import clsx from 'clsx'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'

interface HeaderSectionProps {
  ctaUrl?: string
  cta?: string
  title: string
  subTitle: string
  className?: string
}

function HeaderSection({
  ctaUrl,
  cta,
  title,
  subTitle,
  className,
}: HeaderSectionProps) {
  return (
    <Grid>
      <div
        className={clsx(
          'flex flex-col col-span-full space-y-10 lg:flex-row lg:items-end lg:justify-between lg:space-y-0',
          className,
        )}
      >
        <div className="space-y-2 lg:space-y-0">
          <H2>{title}</H2>
          <H2 variant="secondary" as="p">
            {subTitle}
          </H2>
        </div>

        {cta && ctaUrl ? (
          <ArrowLink to={ctaUrl} direction="right">
            {cta}
          </ArrowLink>
        ) : null}
      </div>
    </Grid>
  )
}

export {HeaderSection}
