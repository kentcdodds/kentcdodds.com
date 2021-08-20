// This handles any users who don't have a convertkit ID for some reason...
// honestly I probably shouldn't have wasted my time on this because I can't
// imagine a real situation where this would be needed. It definitely could
// happen (like someone unsubscribes from the mailing list), but I don't think
// it's a big deal.

import * as React from 'react'
import type {LoaderFunction} from 'remix'
import {useLoaderData, json} from 'remix'
import pThrottle from 'p-throttle'
import {prisma} from '~/utils/prisma.server'
import * as ck from '../../convertkit/convertkit.server'
import {requireAdminUser} from '~/utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  return requireAdminUser(request, async () => {
    const url = new URL(request.url)
    // convert kit has a rate limit of 120 requests per minute
    const throttle = pThrottle({
      limit: 120,
      interval: 61_000,
    })

    const emails = url.searchParams.getAll('email')
    const where = emails.length ? {email: {in: emails}} : {convertKitId: null}

    const users = await prisma.user.findMany({
      select: {firstName: true, email: true, id: true},
      where,
    })

    const getSubThrottled = throttle((email: string) =>
      ck.getConvertKitSubscriber(email),
    )
    const tagSubThrottled = throttle((user: typeof users[number]) =>
      ck.tagKCDSiteSubscriber(user),
    )

    const updatedUsers = await Promise.all(
      users.map(async user => {
        const sub = await getSubThrottled(user.email)
        if (!sub) return null
        await tagSubThrottled(user)

        await prisma.user.update({
          data: {convertKitId: String(sub.id)},
          where: {id: user.id},
        })
        return user
      }),
    )

    return json({updatedCount: updatedUsers.filter(Boolean).length})
  })
}

export default function SyncConvertKit() {
  return <pre>{JSON.stringify(useLoaderData(), null, 2)}</pre>
}
