import * as React from 'react'

import {LoaderFunction, useRouteData} from 'remix'
import {getDb} from '../utils/firebase.server'
import {requireUser} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  return requireUser(request)(async ({userDoc}) => {
    const callsRef = getDb().collection('calls')
    const calls = await callsRef
      .where('userId', '==', `/users/${userDoc.id}`)
      .get()
    return {calls: calls.docs.map(c => ({id: c.id, ...c.data()}))}
  })
}

type Call = {
  id: string
  base64: string
  userId: string
  title: string
  description: string
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
    </section>
  )
}

export default function ListenScreen() {
  const data = useRouteData<{calls: Array<Call>}>()
  return (
    <div>
      <h1>Your calls with Kent</h1>
      <hr />
      {data.calls.map(call => {
        return <CallListing key={call.id} call={call} />
      })}
    </div>
  )
}
