import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import type {KCDHandle} from '~/types'
import * as React from 'react'
import {requireUser} from '~/utils/session.server'
import {getDomainUrl, getErrorMessage} from '~/utils/misc'
import {connectDiscord} from '~/utils/discord.server'
import {deleteDiscordCache} from '~/utils/user-info.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const loader: LoaderFunction = async ({request}) => {
  return requireUser(request, async user => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    url.searchParams.delete('code')
    url.pathname = '/me'
    try {
      if (!code) {
        throw new Error('Discord code required')
      }
      const domainUrl = getDomainUrl(request)
      const discordMember = await connectDiscord({user, code, domainUrl})
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
  })
}

export default function DiscordCallback() {
  return (
    <div>
      {`Congrats! You're seeing something you shouldn't ever be able to see because you should have been redirected. Good job!`}
    </div>
  )
}
