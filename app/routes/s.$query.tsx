import type {DataFunctionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useLoaderData, useParams} from '@remix-run/react'
import {images} from '~/images'
import {H3, H4} from '~/components/typography'
import {HeroSection} from '~/components/sections/hero-section'
import {Grid} from '~/components/grid'
import {Spacer} from '~/components/spacer'
import {searchKCD} from '~/utils/search.server'

type NormalizedItemGroup = {
  prefix: string
  items: Array<{
    route: string
    title: string
    segment: string
    values: {
      priority: string | Array<string | undefined>
      other: Array<string | undefined>
    }
  }>
}

type ListItem = {
  route: string
  title: string
}

type Segment = {name: string; items: Array<ListItem>}

function itemsToSegmentedItems(items: NormalizedItemGroup['items']) {
  const init: Array<Segment> = []
  return items.reduce((segmentedResults, item) => {
    const listItem = {route: item.route, title: item.title}
    const segment = segmentedResults.find(s => s.name === item.segment)
    if (segment) {
      segment.items.push(listItem)
    } else {
      segmentedResults.push({name: item.segment, items: [listItem]})
    }
    return segmentedResults
  }, init)
}

export async function loader({request, params}: DataFunctionArgs) {
  const query = params.query
  if (typeof query !== 'string' || !query) return redirect('/')

  const results = await searchKCD({request, query})

  if (results.length > 1) {
    const data = {
      total: results.length,
      segments: itemsToSegmentedItems(results),
    }
    return json(data)
  }
  const [winner] = results
  if (results.length === 1 && winner) {
    return redirect(winner.route)
  } else {
    return json({total: 0, segments: []})
  }
}

export default function SearchRoute() {
  const {query} = useParams()
  const data = useLoaderData<typeof loader>()
  return (
    <div>
      {data.total > 0 ? (
        <HeroSection
          title="Multiple matches found"
          subtitle="Try something a bit more specific next time."
          arrowUrl="#results"
          arrowLabel={`${data.total} Results`}
          imageBuilder={images.kodyProfileGray}
        />
      ) : (
        <HeroSection
          title="No matches found"
          subtitle="Try being less specific."
          imageBuilder={images.kodyProfileGray}
        />
      )}
      <Grid as="main">
        <div className="col-span-full" id="results">
          <H3>{data.total} Results</H3>
          <H4 as="p" variant="secondary">{`For the query: "${query}"`}</H4>
          <Spacer size="2xs" />
          {data.segments.map(({items, name}) => (
            <div key={name}>
              <H4 className="mb-3">{name}</H4>
              <ul className="list-inside list-disc">
                {items.map(i => (
                  <li key={i.route} className="leading-loose">
                    <Link to={i.route}>{i.title}</Link>
                  </li>
                ))}
              </ul>
              <Spacer size="3xs" />
            </div>
          ))}
        </div>
      </Grid>
    </div>
  )
}
