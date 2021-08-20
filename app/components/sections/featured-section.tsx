import * as React from 'react'
import type {ImageBuilder} from '~/images'
import {getImgProps} from '~/images'
import {Grid} from '../grid'
import {H2, H6} from '../typography'
import {ArrowLink} from '../arrow-button'
import {ClipboardCopyButton} from '../clipboard-copy-button'

type FeaturedSectionProps = {
  caption?: string
  cta?: string
  subTitle?: string
  title?: string
  permalink?: string
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
  title = 'Untitled Post',
  subTitle,
  permalink,
}: FeaturedSectionProps) {
  return (
    <div className="px-8 w-full lg:px-0">
      <div className="lg:dark:bg-transparent bg-gray-100 dark:bg-gray-800 rounded-lg lg:bg-transparent">
        <div className="-mx-8 lg:mx-0">
          <Grid className="group lg:dark:bg-gray-800 pb-6 pt-14 rounded-lg md:pb-12 lg:bg-gray-100">
            <div className="col-span-full lg:flex lg:flex-col lg:col-span-5 lg:col-start-2 lg:justify-between">
              <div>
                <H6 as="h2">{caption}</H6>
                <H2 as="h3" className="mt-12">
                  {title}
                </H2>

                <div className="mt-6 text-blueGray-500 text-xl font-medium">
                  {subTitle}
                </div>
              </div>

              <div className="flex items-center justify-between mt-12">
                <ArrowLink to={slug ?? href ?? '/'}>
                  {cta}
                  <div className="focus-ring absolute z-10 -left-8 -right-8 inset-0 rounded-lg lg:left-0 lg:right-0" />
                </ArrowLink>
              </div>
            </div>

            <div className="relative col-span-full mt-12 lg:col-span-4 lg:col-start-8">
              <div className="w-full">
                {imageBuilder ? (
                  <img
                    className="rounded-lg object-cover"
                    {...getImgProps(imageBuilder, {
                      widths: [300, 600, 900, 1700, 2500],
                      sizes: [
                        '(max-width: 1023px) 80vw',
                        '(min-width:1024px) and (max-width:1620px) 25vw',
                        '410px',
                      ],
                      transformations: {
                        resize: {
                          type: 'fill',
                          aspectRatio: '3:4',
                        },
                      },
                    })}
                  />
                ) : (
                  <img
                    className="rounded-lg object-cover"
                    src={imageUrl}
                    alt={imageAlt}
                  />
                )}
              </div>
              {permalink ? (
                <ClipboardCopyButton
                  className="absolute z-20 left-6 top-6"
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
