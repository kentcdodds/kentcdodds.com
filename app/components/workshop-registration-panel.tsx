import * as React from 'react'
import type {WorkshopEvent} from '../utils/workshop-tickets.server'
import {ButtonLink} from './button'
import {H6} from './typography'

function RegistrationPanel({workshopEvent}: {workshopEvent: WorkshopEvent}) {
  return (
    <div
      id="register"
      className="bg-secondary flex flex-col items-stretch pb-10 pt-12 px-10 w-full rounded-lg lg:flex-row-reverse lg:items-center lg:justify-end lg:py-8"
    >
      <div className="mb-10 lg:mb-0 lg:ml-16">
        <div className="inline-flex items-baseline mb-10 lg:mb-2">
          <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
          <H6 as="p" className="pl-4">
            {`${workshopEvent.remaining} of ${workshopEvent.quantity} spots left`}
          </H6>
        </div>
        {/* note: this heading doesn't scale on narrow screens */}
        <h5 className="text-black dark:text-white text-2xl font-medium">
          {workshopEvent.title}
        </h5>
        <p className="text-secondary">{workshopEvent.date}</p>
      </div>

      <ButtonLink to={workshopEvent.url} className="flex-none">
        Register here
      </ButtonLink>
    </div>
  )
}

export {RegistrationPanel}
