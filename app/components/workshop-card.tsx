import {Link} from 'remix'
import formatDate from 'date-fns/format'
import * as React from 'react'
import type {MdxListItem} from '../../types'
import {H3, H6, Paragraph} from './typography'

function truncate(text: string, length: number) {
  if (!text || text.length <= length) {
    return text
  }

  return `${text.substr(0, length).trim()}…`
}

function WorkshopCard({
  slug,
  open = Math.random() < 0.3,
  frontmatter: {
    date,
    title = 'Untitled Workshop',
    description = 'Description TBA',
    tech,
  },
}: MdxListItem & {open?: boolean}) {
  return (
    <Link
      to={slug}
      className="focus-ring block flex flex-col p-16 pr-24 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg"
    >
      <div className="flex-none h-36">
        {/* TODO: how to determine if it's open or not? */}
        {open ? (
          <div className="inline-flex items-baseline">
            <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
            <H6 as="p" className="pl-4">
              Open for registration
            </H6>
          </div>
        ) : null}
      </div>
      <div className="flex-none">
        <div className="inline-block mb-4 px-8 py-4 text-black dark:text-white text-lg dark:bg-gray-600 bg-white rounded-full">
          {tech}
        </div>
      </div>
      <H3 as="div" className="flex-none mb-3">
        {title}
      </H3>

      <div className="flex-auto mb-10">
        <Paragraph className="line-clamp-3">
          {/*
            We do use css line-clamp, this is for the 10% of the browsers that
            don't support that. Don't focus too much at perfection. It's important
            that the truncated string remains longer than the line-clamp, so that
            line-clamp precedes for the 90% supporting that.
          */}
          {truncate(description, 120)}
        </Paragraph>
      </div>
      <H6 as="div" className="flex flex-wrap lowercase">
        {date ? formatDate(new Date(date), 'PPP') : 'To be announced'}
      </H6>
    </Link>
  )
}

export {WorkshopCard}
