import * as React from 'react'
import {Link} from 'remix'
import type {Workshop} from 'types'
import type {WorkshopEvent} from '../utils/workshop-tickets.server'
import {H3, H6, Paragraph} from './typography'

function truncate(text: string, length: number) {
  if (!text || text.length <= length) {
    return text
  }

  return `${text.substr(0, length).trim()}…`
}

function WorkshopCard({
  workshop,
  workshopEvent,
}: {
  workshop: Workshop
  workshopEvent?: WorkshopEvent
}) {
  return (
    <Link
      to={`/workshops/${workshop.slug}`}
      className="focus-ring flex flex-col p-16 pr-24 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg"
    >
      <div className="flex-none h-36">
        {workshopEvent ? (
          <div className="inline-flex items-baseline">
            <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
            <H6 as="p" className="pl-4">
              Open for registration
            </H6>
          </div>
        ) : null}
      </div>
      {workshop.categories.length ? (
        <div className="flex-none">
          {workshop.categories.map(c => (
            <div
              key={c}
              className="inline-block mb-4 px-8 py-4 text-black dark:text-white text-lg dark:bg-gray-600 bg-white rounded-full"
            >
              {c}
            </div>
          ))}
        </div>
      ) : null}
      <H3 as="div" className="flex-none mb-3">
        {workshop.title}
      </H3>

      <div className="flex-auto mb-10">
        <Paragraph className="line-clamp-3">
          {/*
            We do use css line-clamp, this is for the 10% of the browsers that
            don't support that. Don't focus too much at perfection. It's important
            that the truncated string remains longer than the line-clamp, so that
            line-clamp precedes for the 90% supporting that.
          */}
          {truncate(workshop.description, 120)}
        </Paragraph>
      </div>
      <H6 as="div" className="flex flex-wrap lowercase">
        {workshopEvent ? workshopEvent.date : 'Not currently scheduled'}
      </H6>
    </Link>
  )
}

export {WorkshopCard}
