import type {DataFunctionArgs} from '@remix-run/node'
import {defer, redirect} from '@remix-run/node'
import type {KCDHandle} from '~/types'
import {requireUser} from '~/utils/session.server'
import {
  getDiscordAuthorizeURL,
  getDomainUrl,
  getErrorMessage,
  isResponse,
} from '~/utils/misc'
import {connectDiscord} from '~/utils/discord.server'
import {deleteDiscordCache} from '~/utils/user-info.server'
import {tagKCDSiteSubscriber} from '~/convertkit/convertkit.server'
import {Await, Link, useAsyncError, useLoaderData} from '@remix-run/react'
import React, {Suspense} from 'react'
import {ErrorPanel} from '~/components/form-elements'
import {PartyIcon, RefreshIcon} from '~/components/icons'
import {ensurePrimary} from 'litefs-js/remix'
import {useRootData} from '~/utils/use-root-data'
import {externalLinks} from '~/external-links'
import {ArrowLink} from '~/components/arrow-button'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export async function loader({request}: DataFunctionArgs) {
  await ensurePrimary()
  const user = await requireUser(request)
  const domainUrl = getDomainUrl(request)
  const code = new URL(request.url).searchParams.get('code')

  const url = new URL(domainUrl)
  url.pathname = '/me'

  try {
    if (!code) {
      throw redirect('/discord', {headers: {'x-reason': 'no-code'}})
    }
    const discordMemberPromise = connectDiscord({user, code, domainUrl}).then(
      discordMember => {
        void tagKCDSiteSubscriber({
          email: user.email,
          firstName: user.firstName,
          fields: {
            kcd_site_id: user.id,
            kcd_team: user.team,
            discord_user_id: discordMember.user.id,
          },
        })
        void deleteDiscordCache(discordMember.user.id)
        return discordMember
      },
    )

    return defer({discordMember: discordMemberPromise})
  } catch (error: unknown) {
    if (isResponse(error)) throw error
    console.error(error)

    return defer({discordMember: Promise.reject(error)})
  }
}

export default function DiscordCallback() {
  const data = useLoaderData<typeof loader>()

  React.useEffect(() => {
    const newSearchParams = new URLSearchParams(window.location.search)
    newSearchParams.delete('code')
    window.history.replaceState(
      null,
      '',
      [window.location.pathname, newSearchParams.toString()]
        .filter(Boolean)
        .join('?'),
    )
  })

  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap gap-2">
          <span className="animate-reverse-spin">
            <RefreshIcon />
          </span>
          <p className="animate-pulse">Connecting your account to discord...</p>
        </div>
      }
    >
      <Await
        resolve={data.discordMember}
        errorElement={<DiscordConnectionError />}
      >
        {discordMember => (
          <div className="flex flex-wrap gap-1">
            <span className="text-team-current">
              <PartyIcon />
            </span>
            <span className="text-team-current">
              {discordMember.user.username}#{discordMember.user.discriminator}
            </span>
            {` has been connected to `}
            <span>
              <Link to="/me" className="text-team-current underline">
                your account
              </Link>
              !
            </span>
            <div className="my-6">
              <ArrowLink href="https://kcd.im/discord">
                Start chatting...
              </ArrowLink>
            </div>
          </div>
        )}
      </Await>
    </Suspense>
  )
}

function DiscordConnectionError() {
  const error = useAsyncError()
  const {requestInfo, user} = useRootData()
  const authorizeURL = user
    ? getDiscordAuthorizeURL(requestInfo.origin)
    : externalLinks.discord

  return (
    <ErrorPanel>
      <div>
        Whoops! Sorry, there was an error{' '}
        <span role="img" aria-label="grimace">
          😬
        </span>
      </div>
      <hr className="my-2" />
      <pre className="whitespace-pre-wrap">{getErrorMessage(error)}</pre>
      <hr className="my-2" />
      <a href={authorizeURL} className="underline">
        Try again?
      </a>
    </ErrorPanel>
  )
}
