import * as React from 'react'
import {isFuture, parseISO} from 'date-fns'
import type {WorkshopEvent} from '~/utils/workshop-tickets.server'
import {ButtonLink} from './button'
import {H6} from './typography'
import type {Workshop} from '~/types'

function RegistrationPanel({
  workshopEvent,
}: {
  workshopEvent: WorkshopEvent | Workshop['events'][number]
}) {
  const discounts =
    workshopEvent.type === 'tito'
      ? Object.entries(workshopEvent.discounts).filter(([, discount]) =>
          isFuture(parseISO(discount.ends)),
        )
      : []
  const hasDiscounts = discounts.length > 0
  return (
    <div
      id="register"
      className="bg-secondary flex w-full flex-col items-stretch rounded-lg px-10 pb-10 pt-12 lg:flex-row-reverse lg:items-center lg:justify-end lg:py-8"
    >
      <div className="mb-10 lg:mb-0 lg:ml-16">
        <div className="mb-10 inline-flex items-baseline lg:mb-2">
          <div className="block h-3 w-3 flex-none rounded-full bg-green-600" />
          {workshopEvent.quantity ? (
            <H6 as="p" className="pl-4">
              {workshopEvent.remaining
                ? `${workshopEvent.remaining} of ${workshopEvent.quantity} spots left`
                : `Only ${workshopEvent.quantity} spots total`}
            </H6>
          ) : null}
        </div>
        <h5 className="text-2xl font-medium text-black dark:text-white">
          {workshopEvent.title}
        </h5>
        <div className="flex flex-wrap gap-2">
          <p className="text-secondary inline-block">{workshopEvent.date}</p>
          <span>{hasDiscounts ? ' | ' : null}</span>
          {hasDiscounts ? (
            <div>
              <p className="text-secondary inline-block">Grab a discount:</p>
              <div className="ml-1 inline-block">
                <ul className="flex list-none gap-2">
                  {discounts.map(([code, discount]) => (
                    <li key={code} className="inline-block">
                      <a href={discount.url} className="underlined">
                        {code}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* note: this heading doesn't scale on narrow screens */}

      <ButtonLink href={workshopEvent.url} className="flex-none">
        Register here
      </ButtonLink>
    </div>
  )
}

export {RegistrationPanel}
