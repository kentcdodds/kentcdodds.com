import {
	json,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { type KCDHandle, type Workshop } from '#app/types.ts'
import { reuseUsefulLoaderHeaders } from '#app/utils/misc.tsx'
import { useMatchLoaderData } from '#app/utils/providers.tsx'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import {
	getScheduledEvents,
	type WorkshopEvent,
} from '#app/utils/workshop-tickets.server.ts'
import { getWorkshops } from '#app/utils/workshops.server.ts'

export const handle: KCDHandle & { id: string } = {
	id: 'workshops',
}

export type LoaderData = {
	workshops: Array<Workshop>
	workshopEvents: Array<WorkshopEvent>
	tags: Array<string>
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = {}
	const [workshops, workshopEvents] = await Promise.all([
		getWorkshops({ request, timings }),
		getScheduledEvents({ request, timings }),
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
	return json(data, { headers })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

function WorkshopsHome() {
	return <Outlet />
}

export default WorkshopsHome

export const useWorkshopsData = () => useMatchLoaderData<LoaderData>(handle.id)
