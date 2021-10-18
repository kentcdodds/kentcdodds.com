import * as React from 'react'
import type {HeadersFunction} from 'remix'
import {json, redirect, useLoaderData, Form} from 'remix'
import type {Call, KCDLoader, KCDAction, KCDHandle} from '~/types'
import {requireUser} from '~/utils/session.server'
import {prismaRead, prismaWrite} from '~/utils/prisma.server'
import {Paragraph} from '~/components/typography'
import {reuseUsefulLoaderHeaders, useDoubleCheck} from '~/utils/misc'
import {Button} from '~/components/button'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

const actionTypes = {
  DELETE_RECORDING: 'delete recording',
}

export const action: KCDAction<{callId: string}> = async ({
  params,
  request,
}) => {
  const user = await requireUser(request)
  const call = await prismaRead.call.findFirst({
    // NOTE: this is how we ensure the user is the owner of the call
    // and is therefore authorized to delete it.
    where: {userId: user.id, id: params.callId},
  })
  if (!call) {
    // Maybe they tried to delete a call they don't own?
    console.warn(
      `Failed to get a call to delete by userId: ${user.id} and callId: ${params.callId}`,
    )
    return redirect('/calls/record')
  }
  await prismaWrite.call.delete({where: {id: params.callId}})

  return redirect('/calls/record')
}

type LoaderData = {call: Call}

export const loader: KCDLoader<{callId: string}> = async ({
  params,
  request,
}) => {
  const user = await requireUser(request)
  const call = await prismaRead.call.findFirst({
    // NOTE: this is how we ensure the user is the owner of the call
    // and is therefore authorized to delete it.
    where: {userId: user.id, id: params.callId},
  })
  if (!call) {
    return redirect('/calls/record')
  }
  const data: LoaderData = {call}
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=10',
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export default function Screen() {
  const data = useLoaderData<LoaderData>()
  const [audioURL, setAudioURL] = React.useState<string | null>(null)
  const dc = useDoubleCheck()
  React.useEffect(() => {
    const audio = new Audio(data.call.base64)
    setAudioURL(audio.src)
  }, [data.call.base64])

  return (
    <section>
      <Paragraph className="mb-8">{data.call.description}</Paragraph>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 w-full" style={{minWidth: '16rem'}}>
          {audioURL ? (
            <audio
              src={audioURL}
              controls
              preload="metadata"
              className="w-full"
            />
          ) : null}
        </div>
        <Form method="delete">
          <input
            type="hidden"
            name="actionType"
            value={actionTypes.DELETE_RECORDING}
          />
          <input type="hidden" name="callId" value={data.call.id} />
          <Button
            type="submit"
            variant="danger"
            size="medium"
            autoFocus
            {...dc.getButtonProps()}
          >
            {dc.doubleCheck ? 'You sure?' : 'Delete'}
          </Button>
        </Form>
      </div>
    </section>
  )
}
