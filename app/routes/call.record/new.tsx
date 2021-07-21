import * as React from 'react'
import {redirect, json, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import {CallRecorder} from '../../components/call/recorder'
import {
  RecordingForm,
  RecordingFormData,
} from '../../components/call/submit-recording-form'
import {requireUser} from '../../utils/session.server'
import {prisma, replayable} from '../../utils/prisma.server'
import {getErrorMessage, getNonNull} from '../../utils/misc'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '../../utils/call-kent'
import {callKentStorage} from '../../utils/call-kent.server'

const errorSessionKey = 'call_error'
const fieldsSessionKey = 'call_fields'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
    return replayable(request, async checkIfReplayable => {
      const session = await callKentStorage.getSession(
        request.headers.get('Cookie'),
      )
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
              'Set-Cookie': await callKentStorage.commitSession(session),
            },
          })
        }

        const {audio, title, description, keywords} = getNonNull(formData)

        const call = {
          title,
          description,
          keywords,
          userId: user.id,
          base64: audio,
        }
        const createdCall = await prisma.call.create({data: call})
        return redirect(`/call/record/${createdCall.id}`)
      } catch (error: unknown) {
        const replay = checkIfReplayable(error)
        if (replay) return replay

        session.flash(errorSessionKey, {generalError: getErrorMessage(error)})
        return redirect(new URL(request.url).pathname, {
          headers: {
            'Set-Cookie': await callKentStorage.commitSession(session),
          },
        })
      }
    })
  })
}

type LoaderData = RecordingFormData

export const loader: LoaderFunction = async ({request}) => {
  const session = await callKentStorage.getSession(
    request.headers.get('Cookie'),
  )
  const data: LoaderData = {
    fields: session.get(fieldsSessionKey),
    errors: session.get(errorSessionKey),
  }
  return json(data, {
    headers: {
      'Set-Cookie': await callKentStorage.commitSession(session),
    },
  })
}

export default function RecordScreen() {
  const data = useRouteData<LoaderData>()
  const [audio, setAudio] = React.useState<Blob | null>(null)
  return (
    <div>
      {audio ? (
        <RecordingForm audio={audio} data={data} />
      ) : (
        <CallRecorder onRecordingComplete={recording => setAudio(recording)} />
      )}
    </div>
  )
}
