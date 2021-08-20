import * as React from 'react'
import {redirect, Form, json, useActionData, useLoaderData, Link} from 'remix'
import type {Call, KCDAction, KCDHandle, KCDLoader} from '~/types'
import {format} from 'date-fns'
import {CallRecorder} from '~/components/calls/recorder'
import {requireAdminUser} from '~/utils/session.server'
import {prisma} from '~/utils/prisma.server'
import {
  getAvatarForUser,
  getDomainUrl,
  getErrorMessage,
  getNonNull,
} from '~/utils/misc'
import {createEpisodeAudio} from '~/utils/ffmpeg.server'
import {createEpisode} from '~/utils/transistor.server'
import type {RecordingFormData} from '~/components/calls/submit-recording-form'
import {RecordingForm} from '~/components/calls/submit-recording-form'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '~/utils/call-kent'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type ActionData = RecordingFormData

export const action: KCDAction<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request, async () => {
    if (request.method === 'DELETE') {
      await prisma.call.delete({where: {id: params.callId}})
      return redirect('/calls/admin')
    }
    const call = await prisma.call.findFirst({
      where: {id: params.callId},
      include: {user: true},
    })
    if (!call) {
      // TODO: display an error message or something...
      return redirect('/calls/admin')
    }
    const actionData: ActionData = {fields: {}, errors: {}}
    try {
      const requestText = await request.text()
      const form = new URLSearchParams(requestText)

      const formData = {
        audio: form.get('audio'),
        title: form.get('title'),
        description: form.get('description'),
        keywords: form.get('keywords'),
      }
      actionData.fields = {
        title: formData.title,
        description: formData.description,
        keywords: formData.keywords,
      }

      actionData.errors = {
        audio: getErrorForAudio(formData.audio),
        title: getErrorForTitle(formData.title),
        description: getErrorForDescription(formData.description),
        keywords: getErrorForKeywords(formData.keywords),
      }

      if (Object.values(actionData.errors).some(err => err !== null)) {
        return json(actionData, 401)
      }

      const {
        audio: response,
        title,
        description,
        keywords,
      } = getNonNull(formData)

      const episodeAudio = await createEpisodeAudio(call.base64, response)
      await createEpisode({
        audio: episodeAudio,
        title,
        summary: `${call.user.firstName} asked this on ${format(
          call.createdAt,
          'yyyy-MM-dd',
        )}`,
        description,
        imageUrl: getAvatarForUser(call.user, {size: 800}).src,
        keywords,
        domainUrl: getDomainUrl(request),
      })
      await prisma.call.delete({
        where: {id: call.id},
      })

      return redirect('/calls')
    } catch (error: unknown) {
      actionData.errors.generalError = getErrorMessage(error)
      return json(actionData, 500)
    }
  })
}

type LoaderData = {
  call: Call | null
}

export const loader: KCDLoader<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request, async () => {
    const call = await prisma.call.findFirst({where: {id: params.callId}})
    if (!call) {
      console.error(`No call found at ${params.callId}`)
      // TODO: add message
      return redirect('/calls/admin')
    }
    const data: LoaderData = {call}
    return json(data)
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
      <Form method="delete">
        <input type="hidden" name="callId" value={call.id} />
        <button type="submit">Delete</button>
      </Form>
    </section>
  )
}

export default function RecordingDetailScreen() {
  const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
  const data = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()

  if (!data.call) {
    return (
      <div>
        Oh no... No call by that ID. Too bad. <Link to="..">See all calls</Link>
      </div>
    )
  }
  return (
    <div>
      <CallListing call={data.call} />
      <strong>Record your response:</strong>
      {responseAudio ? (
        <RecordingForm
          audio={responseAudio}
          data={{
            fields: {...data.call, ...actionData?.fields},
            errors: {...actionData?.errors},
          }}
        />
      ) : (
        <CallRecorder
          onRecordingComplete={recording => setResponseAudio(recording)}
        />
      )}
    </div>
  )
}

/*
eslint
  @babel/new-cap: "off",
*/
