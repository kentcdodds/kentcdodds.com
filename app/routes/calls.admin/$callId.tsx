import * as React from 'react'
import type {ActionFunction, LoaderFunction} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, useActionData, useLoaderData} from '@remix-run/react'
import type {Await, KCDHandle} from '~/types'
import {format} from 'date-fns'
import {useRootData, useUser} from '~/utils/use-root-data'
import {CallRecorder} from '~/components/calls/recorder'
import {requireAdminUser} from '~/utils/session.server'
import {prismaWrite, prismaRead} from '~/utils/prisma.server'
import {
  getAvatarForUser,
  getErrorMessage,
  getNonNull,
  useDoubleCheck,
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
import {markdownToHtml} from '~/utils/markdown.server'
import {Button} from '~/components/button'
import {Paragraph} from '~/components/typography'
import {Field} from '~/components/form-elements'
import {Spacer} from '~/components/spacer'
import {sendEmail} from '~/utils/send-email.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type ActionData = RecordingFormData

export const action: ActionFunction = async ({request, params}) => {
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

    const {episodeUrl, imageUrl} = await createEpisode({
      request,
      avatar: form.get('avatar'),
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

    if (episodeUrl) {
      await sendEmail({
        to: call.user.email,
        from: `"Kent C. Dodds" <hello+calls@kentcdodds.com>`,
        subject: `Your "Call Kent" episode has been published`,
        text: `
Hi ${call.user.firstName},

Thanks for your call. Kent just replied and the episode has been published to the podcast!

[![${title}](${imageUrl})](${episodeUrl})
        `.trim(),
      })
    }

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
    include: {user: {select: {firstName: true, team: true, email: true}}},
  })
  if (!call) {
    throw new Error(`No call by the ID of ${callId}`)
  }
  return call
}

export const loader: LoaderFunction = async ({request, params}) => {
  if (!params.callId) {
    throw new Error('params.callId is not defined')
  }
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
        <div className="my-6 flex flex-wrap items-center gap-6">
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

function RecordingDetailScreen() {
  const [responseAudio, setResponseAudio] = React.useState<Blob | null>(null)
  const data = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
  const user = useUser()
  const {requestInfo} = useRootData()
  const [callerAvatar, setCallerAvatar] = React.useState(
    getAvatarForUser(data.call.user, {
      origin: requestInfo.origin,
      size: 1400,
    }).src,
  )

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
          additionalFields={
            <>
              <Field
                label="Avatar"
                description="Episode avatar URL"
                name="avatar"
                value={callerAvatar}
                onChange={e => setCallerAvatar(e.currentTarget.value)}
              />
              <img src={callerAvatar} alt="Caller avatar" className="w-32" />
            </>
          }
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

// IDEA: maybe suggest to the remix team that this would be a good default?
// where params is a key for the route. Got a few spots like this...
export default function RecordDetailScreenContainer() {
  const data = useLoaderData<LoaderData>()
  return <RecordingDetailScreen key={data.call.id} />
}
