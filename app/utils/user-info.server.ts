import type {User} from '~/types'
import * as ck from '../convertkit/convertkit.server'
import * as discord from './discord.server'
import type {Timings} from './metrics.server'
import {getAvatarForUser} from './misc'
import {redisCache} from './redis.server'
import {cachified} from './cache.server'

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
          cache: redisCache,
          request,
          forceFresh,
          maxAge: 1000 * 60 * 60 * 24 * 30,
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
          cache: redisCache,
          request,
          forceFresh,
          maxAge: 1000 * 60 * 60 * 24 * 30,
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

  const userInfo: UserInfo = {
    avatar: getAvatarForUser(user),
    discord: discordUser,
    convertKit: convertKitInfo,
  }
  return userInfo
}

function deleteConvertKitCache(convertKitId: string | number) {
  return redisCache.del(getConvertKitCacheKey(String(convertKitId)))
}

function deleteDiscordCache(discordId: string) {
  return redisCache.del(getDiscordCacheKey(discordId))
}

export {getUserInfo, deleteConvertKitCache, deleteDiscordCache}
