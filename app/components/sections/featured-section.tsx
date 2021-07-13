import * as React from 'react'
import {Grid} from '../grid'
import {H2, H6} from '../typography'
import {ArrowLink} from '../arrow-button'
import {CopyIcon} from '../icons/copy-icon'

type FeaturedSectionProps = {
  caption?: string
  cta?: string
  subTitle?: string
  title?: string
  imageUrl?: string
  imageAlt?: string
} & ({href?: never; slug: string} | {href: string; slug?: never})

function FeaturedSection({
  slug,
  href,
  caption = 'Featured article',
  cta = 'Read full article',
  imageUrl,
  imageAlt,
  title = 'Untitled Post',
  subTitle,
}: FeaturedSectionProps) {
  return (
    <div className="px-8 w-full lg:px-0">
      <div className="lg:dark:bg-transparent bg-gray-100 dark:bg-gray-800 rounded-lg lg:bg-transparent">
        <div className="-mx-8 lg:mx-0">
          <Grid className="lg:dark:bg-gray-800 pb-6 pt-14 rounded-lg md:pb-12 lg:bg-gray-100">
            <div className="col-span-full lg:flex lg:flex-col lg:col-span-5 lg:col-start-2 lg:justify-between">
              <div>
                <H6>{caption}</H6>
                <H2 className="mt-12">{title}</H2>

                <div className="mt-6 text-blueGray-500 text-xl font-medium">
                  {subTitle}
                </div>
              </div>

              <div className="flex items-center justify-between mt-12">
                <ArrowLink to={slug ?? href ?? '/'}>{cta}</ArrowLink>
                <button className="flex items-center justify-center w-12 h-12 text-gray-800 whitespace-nowrap bg-white rounded-lg lg:hidden">
                  <CopyIcon />
                </button>
              </div>
            </div>

            <div className="col-span-full mt-12 lg:col-span-4 lg:col-start-8">
              <div className="aspect-w-3 aspect-h-4 w-full">
                <img
                  className="rounded-lg object-cover"
                  src={imageUrl}
                  alt={imageAlt}
                />
              </div>
            </div>
          </Grid>
        </div>
      </div>
    </div>
  )
}

export {FeaturedSection}
