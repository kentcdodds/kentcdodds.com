import type {ActionFunction, LoaderFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, Outlet, useLoaderData} from '@remix-run/react'
import type {Await, KCDHandle} from '~/types'
import {requireAdminUser} from '~/utils/session.server'
import {prisma} from '~/utils/prisma.server'
import {getAvatarForUser} from '~/utils/misc'
import {useRootData} from '~/utils/use-root-data'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const action: ActionFunction = async ({request}) => {
  await requireAdminUser(request)

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  const callId = form.get('callId')
  if (!callId) {
    // this should be impossible
    console.warn(`No callId provided to call delete action.`)
    return redirect(new URL(request.url).pathname)
  }
  const call = await prisma.call.findFirst({
    // NOTE: since we require an admin user, we don't need to check
    // whether this user is the creator of the call
    where: {id: callId},
  })
  if (!call) {
    // Maybe they tried to delete a call they don't own?
    console.warn(`Failed to get a call to delete by callId: ${callId}`)
    return redirect(new URL(request.url).pathname)
  }
  await prisma.call.delete({where: {id: callId}})
  return redirect(new URL(request.url).pathname)
}

async function getAllCalls() {
  const calls = await prisma.call.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      user: {select: {firstName: true, team: true, email: true}},
    },
    orderBy: {updatedAt: 'desc'},
  })
  return calls
}

type LoaderData = {
  calls: Await<ReturnType<typeof getAllCalls>>
}

export const loader: LoaderFunction = async ({request}) => {
  await requireAdminUser(request)

  const data: LoaderData = {calls: await getAllCalls()}
  return json(data)
}

export default function CallListScreen() {
  const data = useLoaderData<LoaderData>()
  const {requestInfo} = useRootData()
  return (
    <div className="px-6">
      <main className="flex gap-8">
        <div className="w-52 overscroll-auto">
          {data.calls.length ? (
            <ul>
              {data.calls.map(call => {
                const avatar = getAvatarForUser(call.user, {
                  origin: requestInfo.origin,
                })
                return (
                  <li
                    key={call.id}
                    className={`mb-6 set-color-team-current-${call.user.team.toLowerCase()}`}
                  >
                    <Link to={call.id} className="mb-1 block">
                      <img
                        alt={avatar.alt}
                        src={avatar.src}
                        className="block h-16 rounded-full"
                      />
                      {call.title}
                    </Link>
                    <small>
                      {call.description.slice(0, 30)}
                      {call.description.length > 30 ? '...' : null}
                    </small>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>No calls.</p>
          )}
        </div>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
