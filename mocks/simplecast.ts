import type {DefaultRequestBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import type {
  SimplecastCollectionResponse,
  SimpelcastSeasonListItem,
  SimplecastEpisode,
  SimplecastEpisodeListItem,
} from 'types'
import * as faker from 'faker'

const seasonListItems: Array<SimpelcastSeasonListItem> = [
  {
    href: `https://api.simplecast.com/seasons/${faker.datatype.uuid()}`,
    number: 1,
  },
  {
    href: `https://api.simplecast.com/seasons/${faker.datatype.uuid()}`,
    number: 2,
  },
  {
    href: `https://api.simplecast.com/seasons/${faker.datatype.uuid()}`,
    number: 3,
  },
  {
    href: `https://api.simplecast.com/seasons/${faker.datatype.uuid()}`,
    number: 4,
  },
]

const episodesById: Record<string, SimplecastEpisode> = {}
const episodesBySeasonId: Record<string, Array<SimplecastEpisode>> = {}
for (const seasonListItem of seasonListItems) {
  const seasonId = seasonListItem.href.split('/').slice(-1)[0]
  if (!seasonId) throw new Error(`no id for ${seasonListItem.href}`)
  const episodes: Array<SimplecastEpisode> = Array.from(
    {length: faker.datatype.number({min: 10, max: 24})},
    (v, index) => {
      const id = faker.datatype.uuid()
      const title = faker.lorem.words()
      const homework = Array.from(
        {length: faker.datatype.number({min: 1, max: 3})},
        () => faker.lorem.sentence(),
      )
      const resources = Array.from(
        {length: faker.datatype.number({min: 2, max: 7})},
        () =>
          `[${faker.lorem.sentence()}](https://example.com/${faker.lorem.word()})`,
      )
      const guests = Array.from(
        {length: faker.datatype.number({min: 1, max: 3})},
        () => {
          const name = faker.name.findName()
          const username = faker.internet.userName()
          const website = faker.internet.url()
          const links = [
            faker.datatype.boolean()
              ? `Twitter: [@${username}](https://twitter.com/${username})`
              : null,
            faker.datatype.boolean()
              ? `Website: [${new URL(website).origin}](${website})`
              : null,
            faker.datatype.boolean()
              ? `LinkedIn: [@${username}](https://www.linkedin.com/in/${username}/)`
              : null,
            faker.datatype.boolean()
              ? `GitHub: [@${username}](https://github.com/${username})`
              : null,
          ].filter(Boolean)
          return {name, links}
        },
      )
      return {
        id,
        title,
        is_hidden: false,
        duration: faker.datatype.number({min: 1700, max: 2500}),
        number: index + 1,
        transcription: faker.lorem.paragraphs(30),
        status: 'published',
        is_published: true,
        image_url: faker.internet.avatar(),
        audio_file_url:
          'TODO... set audio_file_url to a real file if we ever use this',
        slug: title.split(' ').join('-'),
        description: faker.lorem.sentence(),
        season: seasonListItem,
        long_description: `
${faker.lorem.paragraphs(3)}

* * *

### Homework

* ${homework.join('\n* ')}

### Resources

* ${resources.join('\n* ')}

### ${guests
          .map(guest => {
            return `
Guest: ${guest.name}

${guest.links.length ? `* ${guest.links.join('\n* ')}` : ''}
`.trim()
          })
          .join('\n\n### ')}

### Host: Kent C. Dodds

* Website: [kentcdodds.com](https://kentcdodds.com/)
* Twitter: [@kentcdodds](https://twitter.com/kentcdodds)
* GitHub: [@kentcdodds](https://github.com/kentcdodds)
* Youtube: [Kent C. Dodds](https://www.youtube.com/channel/UCz-BYvuntVRt_VpfR6FKXJw)
        `.trim(),
        keywords: {
          collection: faker.lorem
            .words()
            .split(' ')
            .map(value => ({value})),
        },
      }
    },
  )
  episodesBySeasonId[seasonId] = episodes
  for (const episode of episodes) {
    episodesById[episode.id] = episode
  }
}

const simplecastHandlers: Array<
  RestHandler<MockedRequest<DefaultRequestBody>>
> = [
  rest.get(
    'https://api.simplecast.com/podcasts/:podcastId/seasons',
    (req, res, ctx) => {
      const response: SimplecastCollectionResponse<SimpelcastSeasonListItem> = {
        collection: seasonListItems,
      }
      return res(ctx.json(response))
    },
  ),
  rest.get(
    'https://api.simplecast.com/seasons/:seasonId/episodes',
    (req, res, ctx) => {
      const episodes = episodesBySeasonId[req.params.seasonId]
      if (!episodes) {
        throw new Error(`No mock episodes by season ID: ${req.params.seasonId}`)
      }
      const episodeListItemsResponse: SimplecastCollectionResponse<SimplecastEpisodeListItem> =
        {
          collection: episodes.map(e => ({
            id: e.id,
            is_hidden: e.is_hidden,
            status: e.status,
            is_published: e.is_published,
          })),
        }
      return res(ctx.json(episodeListItemsResponse))
    },
  ),
  rest.get(
    `https://api.simplecast.com/episodes/:episodeId`,
    (req, res, ctx) => {
      return res(ctx.json(episodesById[req.params.episodeId]))
    },
  ),
]

export {simplecastHandlers}
