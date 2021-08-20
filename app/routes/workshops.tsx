import * as React from 'react'
import type {HeadersFunction, LoaderFunction} from 'remix'
import {useLoaderData, json} from 'remix'
import {Outlet} from 'react-router-dom'
import type {Workshop} from '~/types'
import {getWorkshops} from '~/utils/workshops.server'
import type {Timings} from '~/utils/metrics.server'
import {getServerTimeHeader} from '~/utils/metrics.server'
import type {WorkshopEvent} from '~/utils/workshop-tickets.server'
import {getScheduledEvents} from '~/utils/workshop-tickets.server'
import {WorkshopsProvider} from '~/utils/providers'
import {reuseUsefulLoaderHeaders} from '~/utils/misc'

type LoaderData = {
  workshops: Array<Workshop>
  workshopEvents: Array<WorkshopEvent>
  tags: Array<string>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings: Timings = {}
  const workshops = await getWorkshops({request, timings})
  const workshopEvents = await getScheduledEvents()

  const tags = new Set<string>()
  for (const workshop of workshops) {
    for (const category of workshop.categories) {
      tags.add(category)
    }
  }

  const data: LoaderData = {
    workshops,
    workshopEvents,
    tags: Array.from(tags),
  }
  const headers = {
    'Cache-Control': 'public, max-age=3600',
    'Server-Timing': getServerTimeHeader(timings),
  }
  return json(data, {headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

function WorkshopsHome() {
  const data = useLoaderData<LoaderData>()
  return (
    <WorkshopsProvider
      value={{
        workshops: data.workshops,
        workshopEvents: data.workshopEvents,
      }}
    >
      <Outlet />
    </WorkshopsProvider>
  )
}

export default WorkshopsHome
