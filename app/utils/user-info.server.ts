import type {Request} from 'remix'
import type {User} from 'types'
import * as ck from '../convertkit/convertkit.server'
import * as discord from './discord.server'
import type {Timings} from './metrics.server'
import {getAvatarForUser} from './misc'
import {cachified, del} from './redis.server'

type UserInfo = {
  avatar: {
    src: string
    alt: string
  }
  convertKit: {
    tags: Array<{id: string; name: string}>
  } | null
  discord: {
    username: string
  } | null
}

const getConvertKitCacheKey = (convertKitId: string) =>
  `convertkit:${convertKitId}`
const getDiscordCacheKey = (discordId: string) => `discord:${discordId}`

async function getUserInfo(
  user: User,
  {
    request,
    forceFresh,
    timings,
  }: {request?: Request; forceFresh?: boolean; timings?: Timings} = {},
) {
  const {discordId, convertKitId, email} = user
  const [discordUser, convertKitInfo] = await Promise.all([
    discordId
      ? cachified({
          request,
          forceFresh,
          key: getDiscordCacheKey(discordId),
          checkValue: (value: unknown) =>
            typeof value === 'object' && value !== null && 'id' in value,
          getFreshValue: async () => {
            const result = await discord.getDiscordUser(discordId)
            return result
          },
        })
      : null,
    convertKitId
      ? cachified({
          request,
          forceFresh,
          timings,
          key: getConvertKitCacheKey(convertKitId),
          checkValue: (value: unknown) =>
            typeof value === 'object' && value !== null && 'tags' in value,
          getFreshValue: async () => {
            const subscriber = await ck.getConvertKitSubscriber(email)
            if (!subscriber) {
              return {
                tags: [],
              }
            }
            const tags = await ck.getConvertKitSubscriberTags(subscriber.id)
            return {
              tags: tags.map(({name, id}) => ({name, id})),
            }
          },
        })
      : null,
  ])

  const discordAvatarUrl =
    discordId && discordUser?.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png?size=128`
      : undefined
  const userInfo: UserInfo = {
    avatar: getAvatarForUser(user, discordAvatarUrl),
    discord: discordUser,
    convertKit: convertKitInfo,
  }
  return userInfo
}

function deleteConvertKitCache(convertKitId: string | number) {
  return del(getConvertKitCacheKey(String(convertKitId)))
}

function deleteDiscordCache(discordId: string) {
  return del(getDiscordCacheKey(discordId))
}

export {getUserInfo, deleteConvertKitCache, deleteDiscordCache}
