import * as React from 'react'
import {Link} from 'remix'
import formatDate from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import type {MdxListItem} from 'types'
import {useRequestInfo} from '../utils/providers'
import {getImageBuilder, getImgProps} from '../images'
import {H3} from './typography'
import {ClipboardCopyButton} from './clipboard-copy-button'

function ArticleCard({
  readTime,
  slug,
  frontmatter: {
    date = formatDate(new Date(), 'yyyy-MM-ii'),
    title = 'Untitled Post',
    // TODO: add a default banner and alt for unbannered articles
    bannerAlt,
    bannerCloudinaryId,
    bannerCredit,
  },
}: MdxListItem) {
  const requestInfo = useRequestInfo()
  const permalink = `${requestInfo.origin}/blog/${slug}`

  return (
    <div className="relative w-full">
      <Link
        className="group peer relative block w-full focus:outline-none"
        to={`/blog/${slug}`}
      >
        <div className="aspect-w-3 aspect-h-4 focus-ring w-full rounded-lg transition">
          {bannerCloudinaryId ? (
            <img
              {...getImgProps(
                getImageBuilder(
                  bannerCloudinaryId,
                  bannerAlt ?? bannerCredit ?? title,
                ),
                {
                  widths: [280, 560, 840, 1100, 1300, 1650],
                  sizes: [
                    '(max-width:639px) 80vw',
                    '(min-width:640px) and (max-width:1023px) 40vw',
                    '(min-width:1024px) and (max-width:1620px) 25vw',
                    '420px',
                  ],
                },
              )}
              className="rounded-lg object-cover"
            />
          ) : null}
        </div>

        <div className="mt-8 text-blueGray-500 text-xl font-medium lowercase">
          {formatDate(parseISO(date), 'PPP')} — {readTime?.text ?? 'quick read'}
        </div>
        <H3 as="div" className="mt-4">
          {title}
        </H3>
      </Link>

      <ClipboardCopyButton
        value={permalink}
        className="absolute left-6 top-6"
      />
    </div>
  )
}

export {ArticleCard}
