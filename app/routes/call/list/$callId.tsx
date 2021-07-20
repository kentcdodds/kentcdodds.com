import * as React from 'react'
import {redirect, Form, json, useRouteData, Link} from 'remix'
import type {Call, KCDAction, KCDLoader} from 'types'
import {format} from 'date-fns'
import {CallRecorder} from '../../../components/call/recorder'
import {requireAdminUser, rootStorage} from '../../../utils/session.server'
import {prisma, replayable} from '../../../utils/prisma.server'
import {
  getAvatarForUser,
  getErrorMessage,
  getNonNull,
} from '../../../utils/misc'
import {createEpisodeAudio} from '../../../utils/ffmpeg.server'
import {createEpisode} from '../../../utils/transistor.server'
import type {RecordingFormData} from '../../../components/call/submit-recording-form'
import {RecordingForm} from '../../../components/call/submit-recording-form'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '../../../utils/call-kent'

const errorSessionKey = 'call_error'
const fieldsSessionKey = 'call_fields'

export const action: KCDAction<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request, async () => {
    return replayable(request, async checkIfReplayable => {
      if (request.method === 'DELETE') {
        await prisma.call.delete({where: {id: params.callId}})
        return redirect('/call/list')
      }
      const session = await rootStorage.getSession(
        request.headers.get('Cookie'),
      )
      const call = await prisma.call.findFirst({
        where: {id: params.callId},
        include: {user: true},
      })
      if (!call) {
        // TODO: display an error message or something...
        return redirect('/call')
      }
      try {
        const requestText = await request.text()
        const form = new URLSearchParams(requestText)

        const formData = {
          audio: form.get('audio'),
          title: form.get('title'),
          description: form.get('description'),
          keywords: form.get('keywords'),
        }
        const fields: LoaderData['fields'] = {
          title: formData.title,
          description: formData.description,
          keywords: formData.keywords,
        }
        session.flash(fieldsSessionKey, fields)

        const errors = {
          audio: getErrorForAudio(formData.audio),
          title: getErrorForTitle(formData.title),
          description: getErrorForDescription(formData.description),
          keywords: getErrorForKeywords(formData.keywords),
        }

        if (Object.values(errors).some(err => err !== null)) {
          session.flash(errorSessionKey, errors)
          return redirect(new URL(request.url).pathname, {
            headers: {
              'Set-Cookie': await rootStorage.commitSession(session),
            },
          })
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
          imageUrl: getAvatarForUser(call.user).src,
          keywords,
        })
        await prisma.call.delete({
          where: {id: call.id},
        })

        return redirect('/call')
      } catch (error: unknown) {
        const replay = checkIfReplayable(error)
        if (replay) return replay

        const generalError = getErrorMessage(error)
        console.error(generalError)
        session.flash(errorSessionKey, {generalError})
        return redirect(new URL(request.url).pathname, {
          headers: {
            'Set-Cookie': await rootStorage.commitSession(session),
          },
        })
      }
    })
  })
}

type LoaderData = {
  call: Call | null
} & RecordingFormData

export const loader: KCDLoader<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request, async () => {
    const call = await prisma.call.findFirst({where: {id: params.callId}})
    if (!call) {
      console.error(`No call found at ${params.callId}`)
      // TODO: add message
      return redirect('/call')
    }
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const fields: LoaderData['fields'] = {
      title: call.title,
      description: call.description,
      keywords: call.keywords,
      ...session.get(fieldsSessionKey),
    }
    const data: LoaderData = {
      call,
      fields,
      errors: session.get(errorSessionKey),
    }
    return json(data, {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
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
  const data = useRouteData<LoaderData>()

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
        <RecordingForm audio={responseAudio} data={data} />
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
