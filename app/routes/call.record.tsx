import * as React from 'react'
import {Link, Outlet} from 'react-router-dom'
import {json, useRouteData} from 'remix'
import type {LoaderFunction} from 'remix'
import type {Await} from 'types'
import {getUser} from '../utils/session.server'
import {prisma} from '../utils/prisma.server'
import {callKentStorage} from '../utils/call-kent.server'
import {useOptionalUser} from '../utils/providers'

function getCalls(userId: string) {
  return prisma.call.findMany({
    where: {userId},
    select: {id: true, title: true},
  })
}

type LoaderData = {
  calls: Await<ReturnType<typeof getCalls>>
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await callKentStorage.getSession(
    request.headers.get('Cookie'),
  )
  const data: LoaderData = {
    calls: user ? await getCalls(user.id) : [],
  }
  return json(data, {
    headers: {
      'Set-Cookie': await callKentStorage.commitSession(session),
    },
  })
}

export default function RecordScreen() {
  const user = useOptionalUser()
  const data = useRouteData<LoaderData>()
  return (
    <div>
      {user ? (
        <div>
          <div className="flex">
            <div className="w-52 overscroll-auto">
              {data.calls.length ? (
                <ul>
                  {data.calls.map(call => (
                    <li key={call.id}>
                      <Link to={`./${call.id}`}>{call.title}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No calls</p>
              )}
            </div>
            <div>
              <div>
                <Link to="./new">Make a new recording</Link>
              </div>

              <Outlet />
            </div>
          </div>
        </div>
      ) : (
        // TODO: make this more useful
        <div>
          You are not logged in... To get your own questions answered, login
          first...
        </div>
      )}
    </div>
  )
}
