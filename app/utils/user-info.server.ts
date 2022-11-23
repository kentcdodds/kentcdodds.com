import type {User} from '~/types'
import {getImageBuilder, images} from '../images'
import * as ck from '../convertkit/convertkit.server'
import * as discord from './discord.server'
import {getAvatar, getDomainUrl, getOptionalTeam} from './misc'
import {cache, cachified} from './cache.server'
import type {Timings} from './timing.server'

type UserInfo = {
  avatar: {
    src: string
    alt: string
    hasGravatar: boolean
  }
  convertKit: {
    tags: Array<{id: string; name: string}>
  } | null
  discord: {
    username: string
  } | null
}

async function getDirectAvatarForUser(
  {email, team}: Pick<User, 'email' | 'team'>,
  {size = 128, origin}: {size: number; origin?: string},
) {
  const gravatarUrl = getAvatar(email, {fallback: '404', origin})
  const avatarResponse = await fetch(gravatarUrl, {method: 'HEAD'})
  const hasGravatar = avatarResponse.status === 200
  if (hasGravatar) {
    return {hasGravatar, avatar: getAvatar(email, {size, fallback: null})}
  } else {
    const imageProfileIds = {
      RED: images.kodyProfileRed.id,
      BLUE: images.kodyProfileBlue.id,
      YELLOW: images.kodyProfileYellow.id,
      UNKNOWN: images.kodyProfileWhite.id,
    }
    return {
      hasGravatar,
      avatar: getImageBuilder(imageProfileIds[getOptionalTeam(team)])({
        resize: {
          type: 'pad',
          width: size,
          height: size,
        },
      }),
    }
  }
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
  }: {request: Request; forceFresh?: boolean; timings?: Timings},
) {
  const {discordId, convertKitId, email} = user
  const [discordUser, convertKitInfo] = await Promise.all([
    discordId
      ? cachified({
          cache,
          request,
          timings,
          forceFresh,
          ttl: 1000 * 60 * 60 * 24 * 30,
          staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
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
          cache,
          request,
          timings,
          forceFresh,
          ttl: 1000 * 60 * 60 * 24 * 30,
          staleWhileRevalidate: 1000 * 60 * 60 * 24 * 30,
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

  const {avatar, hasGravatar} = await getDirectAvatarForUser(user, {
    size: 128,
    origin: getDomainUrl(request),
  })
  const userInfo: UserInfo = {
    avatar: {
      src: avatar,
      alt: user.firstName,
      hasGravatar,
    },
    discord: discordUser,
    convertKit: convertKitInfo,
  }
  return userInfo
}

async function deleteConvertKitCache(convertKitId: string | number) {
  await cache.delete(getConvertKitCacheKey(String(convertKitId)))
}

async function deleteDiscordCache(discordId: string) {
  await cache.delete(getDiscordCacheKey(discordId))
}

export {
  getUserInfo,
  deleteConvertKitCache,
  deleteDiscordCache,
  getDirectAvatarForUser,
}
