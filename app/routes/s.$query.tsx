import * as React from 'react'
import type {LoaderFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useLoaderData, useParams} from '@remix-run/react'
import {matchSorter, rankings} from 'match-sorter'
import {getBlogMdxListItems} from '~/utils/mdx'
import {getSeasons as getChatsWithKentSeasons} from '~/utils/simplecast.server'
import {getTalksAndTags} from '~/utils/talks.server'
import {getEpisodes as getCallKentEpisodes} from '~/utils/transistor.server'
import {getWorkshops} from '~/utils/workshops.server'
import {stripHtml} from '~/utils/markdown.server'
import {typedBoolean} from '~/utils/misc'
import {getCWKEpisodePath} from '~/utils/chats-with-kent'
import {getEpisodePath as getCKEpisodePath} from '~/utils/call-kent'
import {images} from '~/images'
import {H3, H4} from '~/components/typography'
import {HeroSection} from '~/components/sections/hero-section'
import {Grid} from '~/components/grid'
import {Spacer} from '~/components/spacer'

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

type LoaderData = {
  total: number
  segments: Array<Segment>
}

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

export const loader: LoaderFunction = async ({request, params}) => {
  const query = params.query
  if (typeof query !== 'string' || !query) return redirect('/')

  const [posts, callKentEpisodes, chatsWithKentEpisodes, {talks}, workshops] =
    await Promise.all([
      getBlogMdxListItems({request}),
      getCallKentEpisodes({request}),
      getChatsWithKentSeasons({request}),
      getTalksAndTags({request}),
      getWorkshops({request}),
    ])

  const normalizedGroups: Array<NormalizedItemGroup> = [
    {
      prefix: 'b',
      items: posts.map(p => ({
        route: `/blog/${p.slug}`,
        segment: 'Blog Posts',
        title: p.frontmatter.title ?? 'Untitled',
        values: {
          priority: p.frontmatter.title ?? '',
          other: [
            p.frontmatter.description ?? '',
            ...(p.frontmatter.categories ?? []),
            ...(p.frontmatter.meta?.keywords ?? []),
          ],
        },
      })),
    },
    {
      prefix: 't',
      items: await Promise.all(
        talks.map(async t => ({
          route: `/talks/${t.slug}`,
          segment: 'Talks',
          title: t.title,
          values: {
            priority: t.title,
            other: [
              t.description,
              ...t.tags,
              ...(
                await Promise.all(
                  t.deliveries.map(d =>
                    d.eventHTML ? stripHtml(d.eventHTML) : null,
                  ),
                )
              ).filter(typedBoolean),
            ],
          },
        })),
      ),
    },
    {
      prefix: 'cwk',
      items: await Promise.all(
        chatsWithKentEpisodes
          .flatMap(s => s.episodes)
          .map(async e => ({
            route: getCWKEpisodePath(e),
            title: e.title,
            segment: 'Chats with Kent Episodes',
            values: {
              priority: [
                e.title,
                ...e.guests.flatMap(g => [g.name, g.twitter, g.github]),
              ],
              other: [
                e.description,
                await stripHtml(e.summaryHTML),
                ...e.guests.map(g => g.company),
                ...(await Promise.all(e.homeworkHTMLs.map(h => stripHtml(h)))),
                ...e.resources.flatMap(r => [r.name, r.url]),
              ],
            },
          })),
      ),
    },
    {
      prefix: 'ck',
      items: callKentEpisodes.map(e => ({
        route: getCKEpisodePath(e),
        title: e.title,
        segment: 'Call Kent Podcast Episodes',
        values: {
          priority: e.title,
          other: [e.description, ...e.keywords],
        },
      })),
    },
    {
      prefix: 'w',
      items: await Promise.all(
        workshops.map(async w => ({
          route: `/workshops/${w.slug}`,
          title: w.title,
          segment: 'Workshops',
          values: {
            priority: w.title,
            other: [
              ...w.categories,
              ...w.events.map(e => e.title),
              ...(w.meta.keywords ?? []),
              w.description,
              ...(
                await Promise.all(
                  w.keyTakeawayHTMLs.map(async t => [
                    await stripHtml(t.title),
                    await stripHtml(t.description),
                  ]),
                )
              ).flatMap(s => s),
              ...(await Promise.all(w.topicHTMLs.flatMap(t => stripHtml(t)))),
            ],
          },
        })),
      ),
    },
  ]

  const matchSorterOptions = {
    keys: [
      {key: 'values.priority', threshold: rankings.WORD_STARTS_WITH},
      {
        key: 'values.other',
        threshold: rankings.WORD_STARTS_WITH,
        maxRanking: rankings.CONTAINS,
      },
    ],
  }

  for (const normalizedGroup of normalizedGroups) {
    const prefix = `${normalizedGroup.prefix}:`
    if (!query.startsWith(prefix)) continue
    const actualQuery = query.slice(prefix.length)
    return findWinners(normalizedGroup.items, actualQuery)
  }
  return findWinners(
    normalizedGroups.flatMap(n => n.items),
    query,
  )

  function findWinners(items: NormalizedItemGroup['items'], search: string) {
    const emptyResults = json({total: 0, segments: []})

    const response = handleResults(
      matchSorter(items, search, matchSorterOptions),
    )
    if (response) return response

    // if we couldn't find a winner with the words altogether, try to find one
    // that matches every word
    const words = Array.from(new Set(search.split(' ')))
    // if there's only one word and we got this far we already know it won't match
    // so don't bother and just redirect to home
    if (words.length <= 1) return emptyResults

    return (
      handleResults(
        words.reduce(
          (remaining, word) => matchSorter(remaining, word, matchSorterOptions),
          items,
        ),
      ) ?? emptyResults
    )
  }
}

function handleResults(results: NormalizedItemGroup['items']) {
  if (results.length > 1) {
    const data: LoaderData = {
      total: results.length,
      segments: itemsToSegmentedItems(results),
    }
    return json(data)
  }
  const [winner] = results
  if (results.length === 1 && winner) {
    return redirect(winner.route)
  }
}

export default function SearchRoute() {
  const {query} = useParams()
  const data = useLoaderData<LoaderData>()
  return (
    <div>
      {data.total > 0 ? (
        <HeroSection
          title="Multiple matches found"
          subtitle="Try something a bit more specific next time."
          arrowUrl="#results"
          arrowLabel={`${data.total} Results`}
          imageBuilder={images.kodyProfileWhite}
        />
      ) : (
        <HeroSection
          title="No matches found"
          subtitle="Try being less specific."
          imageBuilder={images.kodyProfileWhite}
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
