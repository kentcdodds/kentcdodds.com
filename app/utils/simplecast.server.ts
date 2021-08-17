import type {
  SimplecastCollectionResponse,
  SimpelcastSeasonListItem,
  SimplecastEpisode,
  SimplecastEpisodeListItem,
  CWKEpisode,
  Request,
  CWKSeason,
} from 'types'
import {omit, sortBy} from 'lodash'
import type * as U from 'unist'
import type * as M from 'mdast'
import {getRequiredServerEnvVar, typedBoolean} from './misc'
import {markdownToHtml} from './markdown.server'
import * as redis from './redis.server'

const SIMPLECAST_KEY = getRequiredServerEnvVar('SIMPLECAST_KEY')
const CHATS_WITH_KENT_PODCAST_ID = getRequiredServerEnvVar(
  'CHATS_WITH_KENT_PODCAST_ID',
)

const headers = {
  authorization: `Bearer ${SIMPLECAST_KEY}`,
}

const seasonsCacheKey = `simplecast:seasons:${CHATS_WITH_KENT_PODCAST_ID}`

const getCachedSeasons = async (request: Request) =>
  redis.cachified({
    key: seasonsCacheKey,
    getFreshValue: getSeasons,
    request,
    checkValue: (value: unknown) =>
      Array.isArray(value) &&
      value.every(
        v => typeof v.seasonNumber === 'number' && Array.isArray(v.episodes),
      ),
  })

async function getSeasons() {
  const res = await fetch(
    `https://api.simplecast.com/podcasts/${CHATS_WITH_KENT_PODCAST_ID}/seasons`,
    {headers},
  )
  const {collection} =
    (await res.json()) as SimplecastCollectionResponse<SimpelcastSeasonListItem>

  const seasons = await Promise.all(
    collection.map(async ({href, number}) => {
      const seasonId = new URL(href).pathname.split('/').slice(-1)[0]
      if (!seasonId) {
        console.error(
          `Could not determine seasonId from ${href} for season ${number}`,
        )
        return
      }
      return {seasonNumber: number, episodes: await getEpisodes(seasonId)}
    }),
  ).then(s => s.filter(typedBoolean))

  return sortBy(seasons, s => Number(s.seasonNumber))
}

async function getEpisodes(seasonId: string) {
  const url = new URL(`https://api.simplecast.com/seasons/${seasonId}/episodes`)
  url.searchParams.set('limit', '300')
  const res = await fetch(url.toString(), {headers})
  const {collection} =
    (await res.json()) as SimplecastCollectionResponse<SimplecastEpisodeListItem>
  const episodes = await Promise.all(
    collection
      .filter(({status, is_hidden}) => status === 'published' && !is_hidden)
      .map(({id}) => getEpisode(id)),
  )
  return episodes.filter(typedBoolean)
}

async function getEpisode(episodeId: string) {
  const res = await fetch(`https://api.simplecast.com/episodes/${episodeId}`, {
    headers,
  })
  const {
    id,
    is_published,
    updated_at,
    slug,
    transcription: transcriptMarkdown,
    long_description: summaryMarkdown,
    description: descriptionMarkdown,
    image_url,
    number,
    duration,
    title,
    season: {number: seasonNumber},
    keywords: keywordsData,
  } = (await res.json()) as SimplecastEpisode
  if (!is_published) {
    return null
  }

  const keywords = keywordsData.collection.map(({value}) => value)
  const [
    transcriptHTML,
    descriptionHTML,
    {summaryHTML, homeworkHTMLs, resources, guests},
  ] = await Promise.all([
    transcriptMarkdown.trim().startsWith('<')
      ? transcriptMarkdown
      : markdownToHtml(transcriptMarkdown),
    descriptionMarkdown.trim().startsWith('<')
      ? descriptionMarkdown
      : markdownToHtml(descriptionMarkdown),
    parseSummaryMarkdown(summaryMarkdown, `${id}-${slug}`),
  ])

  const cwkEpisode: CWKEpisode = {
    transcriptHTML,
    descriptionHTML,
    summaryHTML,
    guests,
    slug,
    resources,
    image: image_url,
    episodeNumber: number,
    updatedAt: updated_at,
    homeworkHTMLs,
    seasonNumber,
    duration,
    title,
    meta: {
      keywords,
    },
    simpleCastId: episodeId,
  }
  return cwkEpisode
}

function removeEls<ItemType>(array: Array<ItemType>, ...els: Array<ItemType>) {
  return array.filter(el => !els.includes(el))
}

async function parseSummaryMarkdown(
  summaryInput: string,
  errorKey: string,
): Promise<
  Pick<CWKEpisode, 'summaryHTML' | 'resources' | 'guests' | 'homeworkHTMLs'>
> {
  const {unified} = await import('unified')
  const {default: parseHtml} = await import('rehype-parse')
  const {default: parseMarkdown} = await import('remark-parse')
  const {default: remark2rehype} = await import('remark-rehype')
  const {default: rehype2remark} = await import('rehype-remark')
  const {default: rehypeStringify} = await import('rehype-stringify')
  const {toHast: mdastToHast} = await import('mdast-util-to-hast')
  const {toHtml: hastToHtml} = await import('hast-util-to-html')
  const {visit} = await import('unist-util-visit')

  const isHTMLInput = summaryInput.trim().startsWith('<')
  const resources: CWKEpisode['resources'] = []
  const guests: CWKEpisode['guests'] = []
  const homeworkHTMLs: CWKEpisode['homeworkHTMLs'] = []

  const result = await unified()
    // @ts-expect-error not sure why typescript doesn't like these plugins
    .use(isHTMLInput ? parseHtml : parseMarkdown)
    .use(isHTMLInput ? rehype2remark : () => {})
    .use(function extractMetaData() {
      return function transformer(tree) {
        type Section = {
          children: Array<U.Node>
          remove: () => void
        }
        const sections: Record<string, Section> = {}
        visit(tree, 'heading', (heading: M.Heading, index, parent) => {
          if (!parent) {
            console.error(heading, `${errorKey} heading without a parent`)
            return
          }
          if (heading.depth !== 3) return

          const nextHeading = parent.children
            .slice((index ?? 0) + 1)
            .find(n => n.type === 'heading' && (n as M.Heading).depth >= 3)
          const endOfSection = nextHeading
            ? parent.children.indexOf(nextHeading)
            : parent.children.length

          const headingChildren = parent.children.slice(
            (index ?? 0) + 1,
            endOfSection,
          )
          const sectionTitle = (heading.children[0] as M.Text | undefined)
            ?.value
          if (!sectionTitle) {
            console.error(`${errorKey}: Section with no title`, heading)
            return
          }
          sections[sectionTitle] = {
            children: headingChildren,
            remove() {
              parent.children = removeEls(
                parent.children,
                heading,
                ...headingChildren,
              )
            },
          }
        })

        for (const [sectionTitle, {children, remove}] of Object.entries(
          sections,
        )) {
          // can't remove elements from an array while you're iterating
          // over that array, so we have to do it afterwards

          if (/kent c. dodds/i.test(sectionTitle)) {
            // we don't need to add any meta data for Kent.
            remove()
            continue
          }
          if (/resources/i.test(sectionTitle)) {
            remove()
            for (const child of children) {
              visit(child, 'listItem', (listItem: M.ListItem) => {
                visit(listItem, 'link', (link: M.Link) => {
                  visit(link, 'text', (text: M.Text) => {
                    resources.push({
                      name: text.value,
                      url: link.url,
                    })
                  })
                })
              })
            }
          }
          if (/homework/i.test(sectionTitle)) {
            remove()
            for (const child of children) {
              visit(child, 'listItem', (listItem: M.ListItem) => {
                homeworkHTMLs.push(
                  listItem.children
                    .map(c => {
                      const hastC = mdastToHast(c)
                      if (!hastC) {
                        console.error(
                          `${errorKey}: list item child that returned no hAST.`,
                          c,
                        )
                        throw new Error(
                          'This should not happen. mdastToHast of a list item child is falsy.',
                        )
                      }
                      return hastToHtml(hastC)
                    })
                    .join(''),
                )
              })
            }
          }
          if (/^guest/i.test(sectionTitle)) {
            remove()
            for (const child of children) {
              let company, github, twitter
              visit(child, 'listItem', (listItem: M.ListItem) => {
                // this error handling makes me laugh and cry
                // definitely better error messages than we'd get
                // if we just pretended this could never happen...
                // ... and you know what... they did happen and I'm glad I added
                // this error handling 😂
                const paragraph = listItem.children[0]
                if (paragraph?.type !== 'paragraph') {
                  console.error(
                    `${errorKey}: guest listItem first child is not a paragraph`,
                    child,
                  )
                  return
                }
                const [text, link] = paragraph.children
                if (text?.type !== 'text') {
                  console.error(
                    `${errorKey}: guest listItem first child's first child is not a text node`,
                    child,
                  )
                  return
                }
                if (link?.type !== 'link') {
                  console.error(
                    `${errorKey}: guest listItem first child's second child is not a link node`,
                    child,
                  )
                  return
                }
                const linkText = link.children[0]
                if (linkText?.type !== 'text') {
                  console.error(
                    `${errorKey}: guest listItem first child's second child's first child is not a text node`,
                    child,
                  )
                  return
                }
                const {value: type} = text
                const {value: name} = linkText
                if (/company/i.test(type)) {
                  company = name
                }
                if (/github/i.test(type)) {
                  github = name.replace('@', '')
                }
                if (/twitter/i.test(type)) {
                  twitter = name.replace('@', '')
                }
              })
              guests.push({
                name: sectionTitle.replace(/^guest:?/i, '').trim(),
                company,
                github,
                twitter,
              })
            }
          }
        }

        const [lastElement] = tree.children.slice(-1)
        if (lastElement?.type === 'thematicBreak') {
          tree.children = removeEls(tree.children, lastElement)
        }
      }
    })
    .use(remark2rehype)
    .use(rehypeStringify)
    .process(summaryInput)

  const summaryHTML = result.value.toString()
  return {
    summaryHTML,
    homeworkHTMLs,
    resources,
    guests,
  }
}

async function getSeasonListItems(request: Request) {
  const seasons = await getCachedSeasons(request)
  const listItemSeasons: Array<CWKSeason> = []
  for (const season of seasons) {
    listItemSeasons.push({
      seasonNumber: season.seasonNumber,
      episodes: season.episodes.map(episode => {
        return omit(
          episode,
          'homeworkHTMLs',
          'resources',
          'summaryHTML',
          'transcriptHTML',
          'meta',
          'descriptionHTML',
        )
      }),
    })
  }
  return listItemSeasons
}

export {getCachedSeasons as getSeasons, getSeasonListItems}
