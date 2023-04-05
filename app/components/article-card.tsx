import {Link} from '@remix-run/react'
import clsx from 'clsx'
import type {MdxListItem, Team} from '~/types'
import {getImageBuilder, getImgProps} from '~/images'
import {H3} from './typography'
import {ClipboardCopyButton} from './clipboard-copy-button'
import {MissingSomething} from './kifs'
import {BlurrableImage} from './blurrable-image'
import {useRootData} from '~/utils/use-root-data'
import {getBannerAltProp, getBannerTitleProp} from '~/utils/mdx'

function ArticleCard({
  leadingTeam,
  article: {
    readTime,
    dateDisplay,
    slug,
    frontmatter,
    frontmatter: {
      title = 'Untitled Post',
      bannerCloudinaryId,
      bannerBlurDataUrl,
    },
  },
}: {
  article: MdxListItem
  leadingTeam?: Team | null
}) {
  const {requestInfo} = useRootData()
  const permalink = `${requestInfo.origin}/blog/${slug}`

  return (
    <div
      className={clsx(
        'relative w-full',
        leadingTeam
          ? `set-color-team-current-${leadingTeam.toLowerCase()}`
          : null,
      )}
    >
      <Link
        prefetch="intent"
        className="group peer relative block w-full focus:outline-none"
        to={`/blog/${slug}`}
      >
        {bannerCloudinaryId ? (
          <BlurrableImage
            key={bannerCloudinaryId}
            blurDataUrl={bannerBlurDataUrl}
            className="aspect-h-4 aspect-w-3 rounded-lg"
            img={
              <img
                title={frontmatter.title ?? getBannerTitleProp(frontmatter)}
                {...getImgProps(
                  getImageBuilder(
                    bannerCloudinaryId,
                    getBannerAltProp(frontmatter),
                  ),
                  {
                    widths: [280, 560, 840, 1100, 1300, 1650],
                    sizes: [
                      '(max-width:639px) 80vw',
                      '(min-width:640px) and (max-width:1023px) 40vw',
                      '(min-width:1024px) and (max-width:1620px) 25vw',
                      '420px',
                    ],
                    transformations: {
                      background: 'rgb:e6e9ee',
                      resize: {
                        type: 'fill',
                        aspectRatio: '3:4',
                      },
                    },
                  },
                )}
                className="focus-ring w-full rounded-lg object-cover object-center transition"
                loading="lazy"
              />
            }
          />
        ) : (
          <div className="aspect-h-4 aspect-w-3">
            <div className="focus-ring w-full rounded-lg transition">
              <MissingSomething aspectRatio="3:4" />
            </div>
          </div>
        )}

        <div className="mt-8 text-xl font-medium text-slate-500">
          {[dateDisplay, readTime?.text ?? 'quick read']
            .filter(Boolean)
            .join(' — ')}
        </div>
        <H3 as="div" className="mt-4">
          {title}
        </H3>
      </Link>

      {leadingTeam ? (
        <div className="absolute right-6 top-6 z-10 h-4 w-4 rounded-full bg-team-current p-1 lg:left-6" />
      ) : null}
      <ClipboardCopyButton
        value={permalink}
        className="absolute left-6 top-6 z-10"
      />
    </div>
  )
}

export {ArticleCard}
