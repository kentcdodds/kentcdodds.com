import * as React from 'react'
import {
  ActionFunction,
  Form,
  LoaderFunction,
  redirect,
  useRouteData,
} from 'remix'
import type {Call} from 'types'
import {requireAdminUser} from '../../utils/session.server'
import {prisma} from '../../utils/prisma.server'

type LoaderData = {
  calls: Array<Call>
}

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

export const loader: LoaderFunction = async ({request}) => {
  return requireAdminUser(request)(async () => {
    const calls = await prisma.call.findMany()
    return {calls}
  })
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

export default function CallListScreen() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h1>All the calls</h1>
      <hr />
      {data.calls.map(call => {
        return <CallListing key={call.id} call={call} />
      })}
    </div>
  )
}
