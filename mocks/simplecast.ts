import type {DefaultRequestMultipartBody, MockedRequest, RestHandler} from 'msw'
import {rest} from 'msw'
import type {
  SimplecastCollectionResponse,
  SimpelcastSeasonListItem,
  SimplecastEpisode,
  SimplecastEpisodeListItem,
} from '~/types'
import {faker} from '@faker-js/faker'

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
          const name = faker.name.fullName()
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
        updated_at: faker.date.past().toISOString(),
        image_url: faker.internet.avatar(),
        audio_file_url: 'set audio_file_url to a real file if we ever use this',
        slug: title.split(' ').join('-'),
        description: faker.lorem.sentence(),
        season: seasonListItem,
        long_description: `
${faker.lorem.paragraphs(3)}

<!-- these links are for testing auto-affiliates -->

[egghead.io](https://egghead.io)

[amazon](https://amazon.com)

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
        enclosure_url:
          'https://cdn.simplecast.com/audio/f1ae04/f1ae0415-6876-4fad-aff9-96d8c26f3dbb/69813706-347b-4fd4-933f-8ab4dcf5a891/tanner-linsley_tc.mp3',
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
  RestHandler<MockedRequest<DefaultRequestMultipartBody>>
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
      if (typeof req.params.seasonId !== 'string') {
        throw new Error('req.params.seasonId is not a string')
      }
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
      if (typeof req.params.episodeId !== 'string') {
        throw new Error('req.params.episodeId is not a string')
      }
      return res(ctx.json(episodesById[req.params.episodeId]))
    },
  ),
]

export {simplecastHandlers}
