import * as React from 'react'
import {Link} from 'remix'
import type {Workshop} from '~/types'
import type {WorkshopEvent} from '~/utils/workshop-tickets.server'
import {Spacer} from './spacer'
import {H3, H6, Paragraph} from './typography'

function truncate(text: string, length: number) {
  if (!text || text.length <= length) {
    return text
  }

  return `${text.substr(0, length).trim()}…`
}

function WorkshopCard({
  workshop,
  titoEvents,
}: {
  workshop: Workshop
  titoEvents: Array<Workshop['events'][number] | WorkshopEvent>
}) {
  const workshopEvents: Array<Workshop['events'][number] | WorkshopEvent> = [
    ...workshop.events,
    ...titoEvents,
  ]
  return (
    <Link
      to={`/workshops/${workshop.slug}`}
      className="focus-ring flex flex-col p-12 pr-16 w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg"
    >
      <H3 as="div" className="flex-none">
        {workshop.title}
      </H3>

      <Spacer size="2xs" />

      {workshop.categories.length ? (
        <div className="flex flex-none flex-wrap gap-2">
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

      <div className="flex-auto">
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

      <Spacer size="2xs" />

      <H6 as="div" className="flex flex-wrap gap-2 items-center">
        {workshopEvents.length ? (
          <>
            <div
              className="block flex-none w-3 h-3 bg-green-600 rounded-full"
              title="Open for registration"
            />
            {workshopEvents.length === 1
              ? workshopEvents[0]?.date
              : 'Multiple events scheduled'}
          </>
        ) : (
          'Not currently scheduled'
        )}
      </H6>
    </Link>
  )
}

export {WorkshopCard}
