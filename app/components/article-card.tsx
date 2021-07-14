import * as React from 'react'
import formatDate from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import type {MdxListItem} from 'types'
import {H3} from './typography'
import {CopyIcon} from './icons/copy-icon'

function ArticleCard({
  readTime,
  slug,
  frontmatter: {
    date = formatDate(new Date(), 'yyyy-MM-ii'),
    title = 'Untitled Post',
    // TODO: add a default banner and alt for unbannered articles
    bannerAlt,
    bannerUrl,
  },
}: MdxListItem) {
  return (
    <div className="relative w-full">
      <a
        className="group peer relative block w-full focus:outline-none"
        href={`/blog/${slug}`}
      >
        <div className="aspect-w-3 aspect-h-4 w-full rounded-lg transition group-hover:ring-2 group-focus:ring-2 ring-team-current ring-offset-4 dark:ring-offset-gray-900 ring-offset-white">
          <img
            alt={bannerAlt}
            className="rounded-lg object-cover"
            src={bannerUrl}
          />
        </div>

        <div className="mt-8 text-blueGray-500 text-xl font-medium">
          {formatDate(parseISO(date), 'PPP')} — {readTime?.text ?? 'quick read'}
        </div>
        <H3 as="div" className="mt-4">
          {title}
        </H3>
      </a>

      <button className="absolute left-6 top-6 p-4 text-black whitespace-nowrap text-lg font-medium hover:bg-gray-200 focus:bg-gray-200 bg-white rounded-lg focus:outline-none shadow hover:shadow-lg focus:shadow-lg peer-hover:opacity-100 hover:opacity-100 peer-focus:opacity-100 focus:opacity-100 transition lg:px-8 lg:py-4 lg:opacity-0">
        <span className="hidden lg:inline">Click to copy url</span>
        <span className="inline lg:hidden">
          <CopyIcon />
        </span>
      </button>
    </div>
  )
}

export {ArticleCard}
