import * as React from 'react'
import clsx from 'clsx'
import {H2} from '../typography'
import {ArrowLink} from '../arrow-button'
import {Grid} from '../grid'

type HeroSectionProps = {
  title: string
  subtitle?: string
  action?: React.ReactNode
} & (
  | {
      imageUrl: string
      imageAlt: string
      imageSize?: 'medium' | 'large' | 'giant'
    }
  | {
      imageUrl?: never
      imageAlt?: never
      imageSize?: never
    }
) &
  (
    | {
        arrowUrl: string
        arrowLabel: string
      }
    | {
        arrowUrl?: never
        arrowLabel?: never
      }
  )

function HeroSection({
  action,
  title,
  subtitle,
  arrowUrl,
  arrowLabel,
  imageUrl,
  imageAlt,
  imageSize = 'medium',
}: HeroSectionProps) {
  return (
    <Grid
      className={clsx('lg:min-h-[40rem] mb-24 pt-24 lg:pb-12 lg:h-hero', {
        'lg:mb-64': arrowLabel,
        'lg:-mb-24': !arrowLabel,
      })}
    >
      {imageUrl ? (
        <div
          className={clsx('col-span-full mb-12 lg:mb-0', {
            'lg:col-start-7 lg:col-span-5 px-10': imageSize === 'medium',
            'lg:col-start-6 lg:col-span-6 pl-10 flex items-start justify-end':
              imageSize === 'large',
            'lg:col-start-6 lg:col-span-7 lg:px-0 lg:-mt-24 lg:-mr-5vw flex items-center justify-center':
              imageSize === 'giant',
          })}
        >
          <img
            className={clsx('w-full h-auto object-contain', {
              'max-h-50vh': imageSize === 'medium',
              'max-h-75vh': imageSize === 'giant',
            })}
            src={imageUrl}
            alt={imageAlt}
          />
        </div>
      ) : null}

      <div
        className={clsx(
          'col-span-full pt-6 lg:flex lg:flex-col lg:col-start-1 lg:row-start-1 lg:h-full',
          {
            'lg:col-span-5': imageUrl,
            'lg:col-span-7': !imageUrl,
          },
        )}
      >
        <div className="flex flex-auto flex-col">
          <H2>{title}</H2>
          {subtitle ? (
            <H2 as="p" variant="secondary" className="mt-3">
              {subtitle}
            </H2>
          ) : null}
          {action ? (
            <div className="flex flex-col mt-14 space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
              {action}
            </div>
          ) : null}
        </div>
        {arrowUrl ? (
          <div className="hidden pt-12 lg:block">
            <ArrowLink to={arrowUrl} direction="down" textSize="small">
              {arrowLabel}
            </ArrowLink>
          </div>
        ) : null}
      </div>
    </Grid>
  )
}

export {HeroSection}
