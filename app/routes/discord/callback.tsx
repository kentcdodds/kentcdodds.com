import type {LoaderFunction} from 'remix'
import {redirect} from 'remix'
import * as React from 'react'
import {requireUser, rootStorage} from '../../utils/session.server'
import {getDomainUrl, getErrorMessage} from '../../utils/misc'
import {connectDiscord} from '../../utils/discord.server'

export const loader: LoaderFunction = async ({request}) => {
  return requireUser(request)(async user => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))

    try {
      const code = new URL(request.url).searchParams.get('code')
      if (!code) {
        throw new Error('Discord code required')
      }
      const domainUrl = getDomainUrl(request)
      const discordMember = await connectDiscord({user, code, domainUrl})
      session.flash(
        'message',
        `Sucessfully connected your KCD account with ${discordMember.user.username} on discord.`,
      )
      return redirect('/me', {
        headers: {'Set-Cookie': await rootStorage.commitSession(session)},
      })
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      console.error(errorMessage)

      session.flash('error', errorMessage)
      return redirect('/discord', {
        headers: {'Set-Cookie': await rootStorage.commitSession(session)},
      })
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
