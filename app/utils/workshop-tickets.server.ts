type TiToDiscount = {
  code: string
  state: 'current' | 'past' | 'unused' | 'upcoming' | 'used'
  quantity: number | null
  quantity_used: number
  share_url: string
  end_at: string
}

type TiToEvent = {
  title: string
  live: boolean
  slug: string
  url: string
  description: string
  banner: {
    url: string | null
    thumb: {url: string | null}
  }
  metadata: unknown
}
type TiToRelease = {
  quantity: number
  tickets_count: number
}
type TiToEventDetails = {
  location: string
  date_or_range: string
  releases: Array<TiToRelease>
}

type TiToActivity = {
  start_at?: string
  end_at?: string
}

type Discount = {url: string; ends: string}
type WorkshopEvent = Pick<
  TiToEvent,
  'banner' | 'description' | 'slug' | 'title' | 'url'
> &
  Pick<TiToEventDetails, 'location'> & {
    quantity: number
    sold: number
    remaining: number
    discounts: Record<string, Discount>
    metadata: {workshopSlug: string}
    date: TiToEventDetails['date_or_range']
    startTime: TiToActivity['start_at']
    endTime: TiToActivity['end_at']
  }

const titoSecret = process.env.TITO_API_SECRET
if (!titoSecret && process.env.NODE_ENV === 'production') {
  console.error(
    `TITO_API_SECRET is not set. Can't get tickets from the ti.to API!`,
  )
}

async function getTito<JsonResponse extends Record<string, unknown>>(
  endpoint: string,
): Promise<JsonResponse> {
  const response = await fetch(
    `https://api.tito.io/v3/kent-c-dodds/${endpoint}`,
    {headers: {Authorization: `Bearer ${titoSecret}`}},
  )
  return response.json()
}

function getDiscounts(codes: Array<TiToDiscount>) {
  const dis: Record<string, {url: string; ends: string}> = {}
  for (const discount of codes) {
    const isEarly = discount.code === 'early'
    const isCurrent = discount.state === 'current'
    const isAvailable = (discount.quantity ?? 0) > discount.quantity_used
    if (isEarly && isCurrent && isAvailable) {
      dis[discount.code] = {
        url: discount.share_url,
        ends: discount.end_at,
      }
    }
  }
  return dis
}

async function getScheduledEvents() {
  if (!titoSecret) return []

  const {events: allEvents} = await getTito<{events: Array<TiToEvent>}>(
    'events',
  )
  const liveEvents = allEvents.filter(event => {
    return (
      (event.metadata as {workshopSlug?: string} | null)?.workshopSlug &&
      event.live
    )
  })
  const events = await Promise.all(
    liveEvents.map(
      async ({
        slug,
        url,
        banner,
        title,
        description,
        metadata,
      }): Promise<WorkshopEvent> => {
        const [event, discounts, activity] = await Promise.all([
          getTito<{event: TiToEventDetails}>(`${slug}`).then(r => r.event),
          getTito<{discount_codes: Array<TiToDiscount>}>(
            `${slug}/discount_codes`,
          ).then(r => getDiscounts(r.discount_codes)),
          getTito<{activities: Array<TiToActivity>}>(`${slug}/activities`).then(
            r => r.activities[0],
          ),
        ])

        const eventInfo = {
          quantity: 0,
          sold: 0,
          remaining: 0,
          location: event.location,
          slug,
          discounts,
          title,
          description,
          banner,
          url,
          // we filter out events without workshopSlugs above
          metadata: metadata as {workshopSlug: string},
          date: event.date_or_range,
          startTime: activity?.start_at,
          endTime: activity?.end_at,
        }

        for (const release of event.releases) {
          eventInfo.quantity += release.quantity
          eventInfo.sold += release.tickets_count
          eventInfo.remaining += release.quantity - release.tickets_count
        }

        return eventInfo
      },
    ),
  )

  return events
}

// we don't want the TiTo integration to prevent the page from showing up
function getScheduledEventsIgnoreErrors() {
  return getScheduledEvents().catch(error => {
    console.error('There was a problem retrieving ti.to info', error)
    return []
  })
}

export {getScheduledEventsIgnoreErrors as getScheduledEvents}
export type {WorkshopEvent}
