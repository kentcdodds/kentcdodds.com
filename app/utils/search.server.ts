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

type NormalizedItemGroup = {
  prefix: string
  items: Array<{
    route: string
    title: string
    segment:
      | 'Blog Posts'
      | 'Chats with Kent Episodes'
      | 'Talks'
      | 'Call Kent Podcast Episodes'
      | 'Workshops'
    values: {
      priority: string | Array<string | undefined>
      other: Array<string | undefined>
    }
  }>
}

export async function searchKCD({
  request,
  query,
}: {
  request: Request
  query: string
}) {
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
            route: getCWKEpisodePath({
              seasonNumber: e.seasonNumber,
              episodeNumber: e.episodeNumber,
            }),
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
        route: getCKEpisodePath({
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
        }),
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
    const results = matchSorter(items, search, matchSorterOptions)
    if (results.length) {
      return results
    }

    // if we couldn't find a winner with the words altogether, try to find one
    // that matches every word
    const words = Array.from(new Set(search.split(' ')))
    // if there's only one word and we got this far we already know it won't match
    // so don't bother and just send back an empty result
    if (words.length <= 1) {
      return []
    }

    return words.reduce(
      (remaining, word) => matchSorter(remaining, word, matchSorterOptions),
      items,
    )
  }
}
