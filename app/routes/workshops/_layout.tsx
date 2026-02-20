import { data as json, type HeadersFunction, Outlet } from 'react-router';
import { type KCDHandle } from '#app/types.ts'
import { reuseUsefulLoaderHeaders, typedBoolean } from '#app/utils/misc.tsx'
import { useMatchLoaderData } from '#app/utils/providers.tsx'
import { type SerializeFrom } from '#app/utils/serialize-from.ts'
import { getServerTimeHeader } from '#app/utils/timing.server.ts'
import { getScheduledEvents } from '#app/utils/workshop-tickets.server.ts'
import { getWorkshops } from '#app/utils/workshops.server.ts'
import  { type Route } from './+types/_layout'

export const handle: KCDHandle & { id: string } = {
	id: 'workshops',
}

export async function loader({ request }: Route.LoaderArgs) {
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
