import * as React from 'react'
import {redirect, Form, json, useActionData, useLoaderData} from 'remix'
import type {Await, KCDAction, KCDHandle, KCDLoader} from '~/types'
import {format} from 'date-fns'
import {useUser} from '~/utils/use-root-data'
import {CallRecorder} from '~/components/calls/recorder'
import {requireAdminUser} from '~/utils/session.server'
import {prismaWrite, prismaRead} from '~/utils/prisma.server'
import {getErrorMessage, getNonNull, useDoubleCheck} from '~/utils/misc'
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
import {markdownToHtml} from '~/utils/markdown.server'
import {Button} from '~/components/button'
import {Paragraph} from '~/components/typography'
import {Field} from '~/components/form-elements'
import {Spacer} from '~/components/spacer'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type ActionData = RecordingFormData

export const action: KCDAction<{callId: string}> = async ({
  request,
  params,
}) => {
  await requireAdminUser(request)

  if (request.method === 'DELETE') {
    await prismaWrite.call.delete({where: {id: params.callId}})
    return redirect('/calls/admin')
  }
  const call = await prismaRead.call.findFirst({
    where: {id: params.callId},
    include: {user: true},
  })
  if (!call) {
    const searchParams = new URLSearchParams()
    searchParams.set('message', 'Call not found')
    return redirect(`/calls/admin?${searchParams.toString()}`)
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

    const {audio: response, title, description, keywords} = getNonNull(formData)

    const episodeAudio = await createEpisodeAudio(call.base64, response)

    await createEpisode({
      audio: episodeAudio,
      title,
      summary: `${call.user.firstName} asked this on ${format(
        call.createdAt,
        'yyyy-MM-dd',
      )}`,
      description: await markdownToHtml(description),
      user: call.user,
      keywords,
    })
    await prismaWrite.call.delete({
      where: {id: call.id},
    })

    return redirect('/calls')
  } catch (error: unknown) {
    actionData.errors.generalError = getErrorMessage(error)
    return json(actionData, 500)
  }
}

type LoaderData = {
  call: Await<ReturnType<typeof getCallInfo>>
}

async function getCallInfo({callId}: {callId: string}) {
  const call = await prismaRead.call.findFirst({
    where: {id: callId},
    include: {user: {select: {firstName: true, team: true}}},
  })
  if (!call) {
    throw new Error(`No call by the ID of ${callId}`)
  }
  return call
}

export const loader: KCDLoader<{callId: string}> = async ({
  request,
  params,
}) => {
  await requireAdminUser(request)

  const call = await getCallInfo({callId: params.callId}).catch(() => null)
  if (!call) {
    console.error(`No call found at ${params.callId}`)
    const searchParams = new URLSearchParams()
    searchParams.set('message', 'Call not found')
    return redirect(`/calls/admin?${searchParams.toString()}`)
  }
  const data: LoaderData = {call}
  return json(data)
}

function CallListing({call}: {call: LoaderData['call']}) {
  const [audioURL, setAudioURL] = React.useState<string | null>(null)
  const [audioEl, setAudioEl] = React.useState<HTMLAudioElement | null>(null)
  const [playbackRate, setPlaybackRate] = React.useState(2)
  const dc = useDoubleCheck()
  React.useEffect(() => {
    const audio = new Audio(call.base64)
    setAudioURL(audio.src)
  }, [call.base64])

  React.useEffect(() => {
    if (!audioEl) return
    audioEl.playbackRate = playbackRate
  }, [audioEl, playbackRate])

  return (
    <section
      className={`set-color-team-current-${call.user.team.toLowerCase()}`}
    >
      <strong className="text-team-current">{call.user.firstName}</strong>{' '}
      <strong>{call.title}</strong>
      <Paragraph>{call.description}</Paragraph>
      {audioURL ? (
        <div className="flex flex-wrap gap-6 items-center my-6">
          <audio
            className="flex-1"
            style={{minWidth: '300px'}}
            ref={el => setAudioEl(el)}
            src={audioURL}
            controls
            preload="metadata"
          />
          <Field
            value={playbackRate}
            onChange={e => setPlaybackRate(Number(e.target.value))}
            label="Playback rate"
            name="playbackRate"
            type="number"
            max="3"
            min="0.5"
            step="0.1"
          />
        </div>
      ) : null}
      <Form method="delete">
        <input type="hidden" name="callId" value={call.id} />
        <Button type="submit" variant="danger" {...dc.getButtonProps()}>
          {dc.doubleCheck ? 'You sure?' : 'Delete'}
        </Button>
      </Form>
    </section>
  )
}

export default function RecordingDetailScreen() {
  const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
  const data = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
  const user = useUser()

  return (
    <div key={data.call.id}>
      <CallListing call={data.call} />
      <Spacer size="xs" />
      <strong>Record your response:</strong>
      <Spacer size="2xs" />
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
          team={user.team}
        />
      )}
    </div>
  )
}

/*
eslint
  @babel/new-cap: "off",
*/
