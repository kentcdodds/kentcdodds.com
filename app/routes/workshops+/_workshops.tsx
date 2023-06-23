import {json, type HeadersFunction, type LoaderFunction} from '@remix-run/node'
import {Outlet} from '@remix-run/react'
import {type KCDHandle, type Workshop} from '~/types'
import {reuseUsefulLoaderHeaders} from '~/utils/misc'
import {useMatchLoaderData} from '~/utils/providers'
import {getServerTimeHeader} from '~/utils/timing.server'
import {
  getScheduledEvents,
  type WorkshopEvent,
} from '~/utils/workshop-tickets.server'
import {getWorkshops} from '~/utils/workshops.server'

export const handle: KCDHandle & {id: string} = {
  id: 'workshops',
}

export type LoaderData = {
  workshops: Array<Workshop>
  workshopEvents: Array<WorkshopEvent>
  tags: Array<string>
}

export const loader: LoaderFunction = async ({request}) => {
  const timings = {}
  const [workshops, workshopEvents] = await Promise.all([
    getWorkshops({request, timings}),
    getScheduledEvents({request, timings}),
  ])

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
    Vary: 'Cookie',
    'Server-Timing': getServerTimeHeader(timings),
  }
  return json(data, {headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

function WorkshopsHome() {
  return <Outlet />
}

export default WorkshopsHome

export const useWorkshopsData = () => useMatchLoaderData<LoaderData>(handle.id)
