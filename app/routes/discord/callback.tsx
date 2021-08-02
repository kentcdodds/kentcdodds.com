import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {requireUser} from '../../utils/session.server'
import {getDomainUrl, getErrorMessage} from '../../utils/misc'
import {connectDiscord} from '../../utils/discord.server'

export const loader: LoaderFunction = async ({request}) => {
  return requireUser(request, async user => {
    try {
      const code = new URL(request.url).searchParams.get('code')
      if (!code) {
        throw new Error('Discord code required')
      }
      const domainUrl = getDomainUrl(request)
      const discordMember = await connectDiscord({user, code, domainUrl})

      const url = new URL('/me')
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

      const url = new URL('/me')
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
