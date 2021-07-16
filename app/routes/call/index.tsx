import * as React from 'react'

import {json, Form, Link, redirect, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import type {Call} from 'types'
import {prisma} from '../../utils/prisma.server'
import {requireUser, getUser} from '../../utils/session.server'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
    const requestText = await request.text()
    const form = new URLSearchParams(requestText)
    const callId = form.get('callId')
    if (!callId) {
      // this should be impossible
      console.warn(`No callId provided to call delete action.`)
      return redirect(new URL(request.url).pathname)
    }
    const call = await prisma.call.findFirst({
      // NOTE: this is how we ensure the user is the owner of the call
      // and is therefore authorized to delete it.
      where: {userId: user.id, id: callId},
    })
    if (!call) {
      // Maybe they tried to delete a call they don't own?
      console.warn(
        `Failed to get a call to delete by userId: ${user.id} and callId: ${callId}`,
      )
      return redirect(new URL(request.url).pathname)
    }
    await prisma.call.delete({where: {id: callId}})
    return redirect(new URL(request.url).pathname)
  })
}

type LoaderData = {
  calls: Array<Call>
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  let calls: Array<Call> = []
  if (user) {
    calls = await prisma.call.findMany({where: {userId: user.id}})
  }
  const data: LoaderData = {calls}
  return json(data)
}

function CallListing({call}: {call: Call}) {
  const [audioURL, setAudioURL] = React.useState<string | null>(null)
  React.useEffect(() => {
    const audio = new Audio(call.base64)
    setAudioURL(audio.src)
  }, [call.base64])

  return (
    <section>
      <strong>{call.title}</strong>
      <p>{call.description}</p>
      <div>{audioURL ? <audio src={audioURL} controls /> : null}</div>
      <Form method="post">
        <input type="hidden" name="callId" value={call.id} />
        <button type="submit">Delete</button>
      </Form>
    </section>
  )
}

export default function CallHomeScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h2>Your calls with Kent</h2>
      <hr />
      <Link to="./record">Record a new call</Link>
      <hr />
      {data.calls.map(call => {
        return <CallListing key={call.id} call={call} />
      })}
    </div>
  )
}
