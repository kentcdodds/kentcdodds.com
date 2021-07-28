import type {User} from 'types'
// import {getConvertKitSubscriber} from './convertkit.server'
import * as discord from './discord.server'
import {getAvatarForUser} from './misc'

type UserInfo = {
  avatar: {
    src: string
    alt: string
  }
  convertKit?: {
    subscribedToNewsletter: boolean
  }
  discord?: {
    username: string
  }
}

async function getUserInfo(user: User) {
  const userInfo: UserInfo = {
    avatar: getAvatarForUser(user),
  }
  if (user.convertKitId) {
    // const subscriber = await getConvertKitSubscriber(user.email)
    userInfo.convertKit = {
      // TODO: this is incorrect... Gotta find out if they're actually on the form somehow...
      // https://community.convertkit.com/question/api-question-how-can-i-determine-whether-a-subscriber-is-subscribed-to-a-sp--60daaa1c6bd89706409cab6a
      // subscribedToNewsletter: subscriber?.state === 'active',
      subscribedToNewsletter: false,
    }
  }
  if (user.discordId) {
    const discordUser = await discord.getDiscordUser(user.discordId)
    userInfo.discord = {
      username: `${discordUser.username}#${discordUser.discriminator}`,
    }
  }
  return userInfo
}

export {getUserInfo}
