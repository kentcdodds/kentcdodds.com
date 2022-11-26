import clsx from 'clsx'
import type {ImageBuilder} from '~/images'
import {getImgProps} from '~/images'
import {Grid} from '../grid'
import {H2, H6} from '../typography'
import {ArrowLink} from '../arrow-button'
import {ClipboardCopyButton} from '../clipboard-copy-button'
import type {Team} from '~/types'
import {BlurrableImage} from '../blurrable-image'

type FeaturedSectionProps = {
  caption?: string
  cta?: string
  subTitle?: string
  title?: string
  permalink?: string
  leadingTeam?: Team | null
  blurDataUrl?: string
} & (
  | {
      imageBuilder?: ImageBuilder
      imageUrl?: never
      imageAlt?: never
    }
  | {
      imageBuilder?: never
      /** use the imageBuilder if possible. imageUrl is for things we don't have in cloudinary */
      imageUrl?: string
      imageAlt?: string
    }
) &
  ({href?: never; slug: string} | {href: string; slug?: never})

function FeaturedSection({
  slug,
  href,
  caption = 'Featured article',
  cta = 'Read full article',
  imageBuilder,
  imageUrl,
  imageAlt,
  blurDataUrl,
  title = 'Untitled Post',
  subTitle,
  permalink,
  leadingTeam,
}: FeaturedSectionProps) {
  const img = imageBuilder ? (
    <img
      className="rounded-lg object-cover object-center"
      {...getImgProps(imageBuilder, {
        widths: [300, 600, 900, 1700, 2500],
        sizes: [
          '(max-width: 1023px) 80vw',
          '(min-width:1024px) and (max-width:1620px) 25vw',
          '410px',
        ],
        transformations: {background: 'rgb:e6e9ee'},
      })}
    />
  ) : (
    <img
      className="rounded-lg object-cover object-center"
      src={imageUrl}
      alt={imageAlt}
    />
  )
  return (
    <div
      className={clsx(
        'w-full px-8 lg:px-0',
        leadingTeam
          ? `set-color-team-current-${leadingTeam.toLowerCase()}`
          : null,
      )}
    >
      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 lg:bg-transparent lg:dark:bg-transparent">
        <div className="-mx-8 lg:mx-0">
          <Grid className="group rounded-lg pb-6 pt-14 md:pb-12 lg:bg-gray-100 lg:dark:bg-gray-800">
            <div className="col-span-full lg:col-span-5 lg:col-start-2 lg:flex lg:flex-col lg:justify-between">
              <div>
                <H6 as="h2">{caption}</H6>
                <H2 as="h3" className="mt-12">
                  {title}
                </H2>

                <div className="mt-6 text-xl font-medium text-slate-500">
                  {subTitle}
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between">
                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                <ArrowLink to={slug ?? href ?? '/'} prefetch="intent">
                  {cta}
                  <div className="focus-ring absolute inset-0 left-0 right-0 z-10 rounded-lg md:-left-12 md:-right-12 lg:left-0 lg:right-0" />
                </ArrowLink>
              </div>
            </div>

            <div className="relative col-span-full mt-12 lg:col-span-4 lg:col-start-8">
              {blurDataUrl ? (
                <BlurrableImage
                  blurDataUrl={blurDataUrl}
                  img={img}
                  className="aspect-w-4 aspect-h-3 lg:aspect-h-5 lg:aspect-w-4"
                />
              ) : (
                <div className="aspect-w-4 aspect-h-3 lg:aspect-h-5 lg:aspect-w-4">
                  {img}
                </div>
              )}
              {leadingTeam ? (
                <div className="absolute left-6 top-6 z-20 h-4 w-4 rounded-full bg-team-current p-1" />
              ) : null}
              {permalink ? (
                <ClipboardCopyButton
                  className="absolute left-6 top-6 z-20"
                  value={permalink}
                />
              ) : null}
            </div>
          </Grid>
        </div>
      </div>
    </div>
  )
}

export {FeaturedSection}
