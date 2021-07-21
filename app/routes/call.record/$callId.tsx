import * as React from 'react'
import {json, redirect, useRouteData, Form} from 'remix'
import type {Call, KCDLoader, KCDAction} from 'types'
import {requireUser} from '../../utils/session.server'
import {prisma} from '../../utils/prisma.server'

const actionTypes = {
  DELETE_RECORDING: 'delete recording',
}

export const action: KCDAction<{callId: string}> = async ({
  params,
  request,
}) => {
  return requireUser(request, async user => {
    const call = await prisma.call.findFirst({
      // NOTE: this is how we ensure the user is the owner of the call
      // and is therefore authorized to delete it.
      where: {userId: user.id, id: params.callId},
    })
    if (!call) {
      // Maybe they tried to delete a call they don't own?
      console.warn(
        `Failed to get a call to delete by userId: ${user.id} and callId: ${params.callId}`,
      )
      return redirect('/call/record')
    }
    await prisma.call.delete({where: {id: params.callId}})
    return redirect('/call/record')
  })
}

type LoaderData = {call: Call}

export const loader: KCDLoader<{callId: string}> = async ({
  params,
  request,
}) => {
  return requireUser(request, async user => {
    const call = await prisma.call.findFirst({
      // NOTE: this is how we ensure the user is the owner of the call
      // and is therefore authorized to delete it.
      where: {userId: user.id, id: params.callId},
    })
    if (!call) {
      // TODO: handle 404 instead of redirecting
      return redirect('..')
    }
    const data: LoaderData = {call}
    return json(data)
  })
}

export default function Screen() {
  const data = useRouteData<LoaderData>()
  const [audioURL, setAudioURL] = React.useState<string | null>(null)
  React.useEffect(() => {
    const audio = new Audio(data.call.base64)
    setAudioURL(audio.src)
  }, [data.call.base64])

  return (
    <section>
      <strong>{data.call.title}</strong>
      <p>{data.call.description}</p>
      <div>{audioURL ? <audio src={audioURL} controls /> : null}</div>
      <Form method="post">
        <input
          type="hidden"
          name="actionType"
          value={actionTypes.DELETE_RECORDING}
        />
        <input type="hidden" name="callId" value={data.call.id} />
        <button type="submit">Delete</button>
      </Form>
    </section>
  )
}
