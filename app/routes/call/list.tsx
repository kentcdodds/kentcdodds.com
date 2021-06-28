import * as React from 'react'
import {
  ActionFunction,
  Link,
  LoaderFunction,
  redirect,
  useRouteData,
} from 'remix'
import {Outlet} from 'react-router-dom'
import type {Await} from 'types'
import {requireAdminUser} from '../../utils/session.server'
import {prisma} from '../../utils/prisma.server'
import {getAvatar} from '../../utils/misc'

export const action: ActionFunction = async ({request}) => {
  return requireAdminUser(request)(async () => {
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
  })
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
  return requireAdminUser(request)(async () => {
    const data: LoaderData = {calls: await getAllCalls()}
    return data
  })
}

export default function CallListScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h2>All the calls</h2>
      <hr />
      <ul>
        {data.calls.map(call => (
          <li key={call.id}>
            <img
              alt={`${call.user.firstName} avatar`}
              src={getAvatar(call.user.email)}
              style={{
                height: 64,
                borderColor: call.user.team.toLowerCase(),
                borderWidth: 2,
                borderStyle: 'solid',
              }}
            />
            <Link to={call.id}>{call.title}</Link>
            <small>{call.description}</small>
          </li>
        ))}
      </ul>
      <hr />
      <Outlet />
    </div>
  )
}
