import * as React from 'react'
import formatDate from 'date-fns/format'
import type {MdxListItem} from 'types'
import {H3} from './typography'
import {CopyIcon} from './icons/copy-icon'

function ArticleCard({
  readTime,
  slug,
  frontmatter: {
    date = new Date().getTime(),
    title = 'Untitled Post',
    // TODO: add a default banner and alt for unbannered articles
    bannerAlt,
    bannerUrl,
  },
}: MdxListItem) {
  return (
    <a className="group relative w-full" href={`/blog/${slug}`}>
      <button className="absolute z-10 left-6 top-6 p-4 text-black whitespace-nowrap text-lg font-medium bg-white rounded-lg group-hover:opacity-100 transition lg:px-8 lg:py-4 lg:opacity-0">
        <span className="hidden lg:inline">Click to copy url</span>
        <span className="inline lg:hidden">
          <CopyIcon />
        </span>
      </button>

      <div className="aspect-w-3 aspect-h-4 w-full">
        <img
          alt={bannerAlt}
          className="rounded-lg object-cover"
          src={bannerUrl}
        />
      </div>

      <div className="mt-8 text-blueGray-500 text-xl font-medium">
        {formatDate(new Date(date), 'PPP')} — {readTime?.text ?? 'quick read'}
      </div>
      <div className="mt-4 group-hover:underline">
        <H3>{title}</H3>
      </div>
    </a>
  )
}

export {ArticleCard}
