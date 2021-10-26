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
      className="bg-secondary flex flex-col items-stretch pb-10 pt-12 px-10 w-full rounded-lg lg:flex-row-reverse lg:items-center lg:justify-end lg:py-8"
    >
      <div className="mb-10 lg:mb-0 lg:ml-16">
        <div className="inline-flex items-baseline mb-10 lg:mb-2">
          <div className="block flex-none w-3 h-3 bg-green-600 rounded-full" />
          {workshopEvent.quantity ? (
            <H6 as="p" className="pl-4">
              {workshopEvent.remaining
                ? `${workshopEvent.remaining} of ${workshopEvent.quantity} spots left`
                : `Only ${workshopEvent.quantity} spots total`}
            </H6>
          ) : null}
        </div>
        <h5 className="text-black dark:text-white text-2xl font-medium">
          {workshopEvent.title}
        </h5>
        <div className="flex flex-wrap gap-2">
          <p className="text-secondary inline-block">{workshopEvent.date}</p>
          <span>{hasDiscounts ? ' | ' : null}</span>
          {hasDiscounts ? (
            <div>
              <p className="text-secondary inline-block">Grab a discount:</p>
              <div className="inline-block ml-1">
                <ul className="flex gap-2 list-none">
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
