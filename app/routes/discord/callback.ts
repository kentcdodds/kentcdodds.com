import type {DataFunctionArgs} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import type {KCDHandle} from '~/types'
import {requireUser} from '~/utils/session.server'
import {getDomainUrl, getErrorMessage} from '~/utils/misc'
import {connectDiscord} from '~/utils/discord.server'
import {deleteDiscordCache} from '~/utils/user-info.server'
import {tagKCDSiteSubscriber} from '~/convertkit/convertkit.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export async function loader({request}: DataFunctionArgs) {
  const user = await requireUser(request)
  const domainUrl = getDomainUrl(request)
  const code = new URL(request.url).searchParams.get('code')

  const url = new URL(domainUrl)
  url.pathname = '/me'

  try {
    if (!code) {
      throw new Error('Discord code required')
    }
    const discordMember = await connectDiscord({user, code, domainUrl})
    void tagKCDSiteSubscriber({
      email: user.email,
      firstName: user.firstName,
      fields: {
        kcd_site_id: user.id,
        kcd_team: user.team,
        discord_user_id: discordMember.user.id,
      },
    })
    await deleteDiscordCache(discordMember.user.id)

    url.searchParams.set(
      'message',
      `✅ Sucessfully connected your KCD account with ${discordMember.user.username} on discord.`,
    )
    return redirect(url.toString())
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    if (error instanceof Error) {
      console.error(error.stack)
    } else {
      console.error(errorMessage)
    }

    url.searchParams.set('message', `🚨 ${errorMessage}`)
    return redirect(url.toString())
  }
}
