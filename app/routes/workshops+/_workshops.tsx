import {
	type SerializeFrom,
	json,
	type HeadersFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { type KCDHandle } from '#app/types.ts'
import { reuseUsefulLoaderHeaders, typedBoolean } from '#app/utils/misc.tsx'
import { useMatchLoaderData } from '#app/utils/providers.tsx'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { getScheduledEvents } from '#app/utils/workshop-tickets.server.ts'
import { getWorkshops } from '#app/utils/workshops.server.ts'

export const handle: KCDHandle & { id: string } = {
	id: 'workshops',
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

	const headers = {
		'Cache-Control': 'public, max-age=3600',
		Vary: 'Cookie',
		'Server-Timing': getServerTimeHeader(timings),
	}
	return json(
		{
			workshops: workshops.filter(typedBoolean),
			workshopEvents: workshopEvents.filter(typedBoolean),
			tags: Array.from(tags),
		},
		{ headers },
	)
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

function WorkshopsHome() {
	return <Outlet />
}

export default WorkshopsHome

export const useWorkshopsData = () =>
	useMatchLoaderData<SerializeFrom<typeof loader>>(handle.id)
