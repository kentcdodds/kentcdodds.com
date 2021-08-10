import type {Request} from 'remix'
import type {User} from 'types'
import * as ck from '../convertkit/convertkit.server'
import * as discord from './discord.server'
import type {Timings} from './metrics.server'
import {getAvatarForUser} from './misc'
import {cachified} from './redis.server'

type UserInfo = {
  avatar: {
    src: string
    alt: string
  }
  convertKit?: {
    isInMailingList: boolean
    tags: Array<{id: string; name: string}>
  }
  discord?: {
    username: string
  }
}

async function getUserInfo(
  user: User,
  {
    request,
    forceFresh,
    timings,
  }: {request?: Request; forceFresh?: boolean; timings?: Timings} = {},
) {
  const userInfo: UserInfo = {
    avatar: getAvatarForUser(user),
  }
  const {discordId, convertKitId, email} = user
  if (convertKitId) {
    userInfo.convertKit = await cachified({
      request,
      forceFresh,
      timings,
      key: `convertkit:${convertKitId}`,
      checkValue: (value: unknown) =>
        typeof value === 'object' &&
        value !== null &&
        'isInMailingList' in value,
      getFreshValue: async () => {
        const subscriber = await ck.getConvertKitSubscriber(email)
        if (!subscriber) {
          return {
            isInMailingList: false,
            tags: [],
          }
        }
        const tags = await ck.getConvertKitSubscriberTags(subscriber.id)
        return {
          isInMailingList: Boolean(subscriber),
          tags: tags.map(({name, id}) => ({name, id})),
        }
      },
    })
  }
  if (discordId) {
    const discordUser = await cachified({
      request,
      forceFresh,
      key: `discord:${user.discordId}`,
      checkValue: (value: unknown) =>
        typeof value === 'object' && value !== null && 'id' in value,
      getFreshValue: async () => {
        const result = await discord.getDiscordUser(discordId)
        return result
      },
    })
    userInfo.discord = {
      username: `${discordUser.username}#${discordUser.discriminator}`,
    }
  }
  return userInfo
}

export {getUserInfo}
