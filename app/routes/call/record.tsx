import * as React from 'react'
import {useSubmit, redirect, Form, json, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import type {Call} from 'types'
import {CallRecorder} from '../../components/call/recorder'
import type {RecordingFormData} from '../../components/call/submit-recording-form'
import {getUser, requireUser, rootStorage} from '../../utils/session.server'
import {prisma} from '../../utils/prisma.server'
import {getErrorMessage, getNonNull} from '../../utils/misc'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '../../utils/call-kent'

const errorSessionKey = 'call_error'
const fieldsSessionKey = 'call_fields'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
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

      const {audio, title, description, keywords} = getNonNull(formData)

      const call = {
        title,
        description,
        keywords,
        userId: user.id,
        base64: audio,
      }
      await prisma.call.create({data: call})
      return redirect('/call')
    } catch (error: unknown) {
      session.flash(errorSessionKey, {generalError: getErrorMessage(error)})
      return redirect('/contact', {
        headers: {
          'Set-Cookie': await rootStorage.commitSession(session),
        },
      })
    }
  })
}

type LoaderData = {
  calls?: Array<Call>
} & RecordingFormData

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  let calls: Array<Call> = []
  if (user) {
    calls = await prisma.call.findMany({where: {userId: user.id}})
  }
  const data: LoaderData = {
    calls,
    fields: session.get(fieldsSessionKey),
    errors: session.get(errorSessionKey),
  }
  return json(data, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
  })
}

function SubmitRecordingForm({audio}: {audio: Blob}) {
  const data = useRouteData<LoaderData>()
  const [audioURL, setAudioURL] = React.useState<string | null>(null)
  React.useEffect(() => {
    setAudioURL(window.URL.createObjectURL(audio))
  }, [audio])
  const submit = useSubmit()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const reader = new FileReader()
    reader.readAsDataURL(audio)
    reader.addEventListener(
      'loadend',
      () => {
        if (typeof reader.result === 'string') {
          form.append('audio', reader.result)
          submit(form, {method: 'post'})
        }
      },
      {once: true},
    )
  }

  return audioURL ? (
    <div>
      <audio src={audioURL} controls aria-describedby="audio-error-message" />
      {data.errors?.audio ? (
        <p id="audio-error-message" className="text-red-600 text-center">
          {data.errors.audio}
        </p>
      ) : null}
      <Form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            aria-describedby="title-error-message"
            defaultValue={data.fields?.title ?? ''}
          />
          {data.errors?.title ? (
            <p id="title-error-message" className="text-red-600 text-center">
              {data.errors.title}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={data.fields?.description ?? ''}
          />
          {data.errors?.description ? (
            <p
              id="description-error-message"
              className="text-red-600 text-center"
            >
              {data.errors.description}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="keywords">Keywords</label>
          <textarea
            id="keywords"
            name="keywords"
            defaultValue={data.fields?.keywords ?? ''}
          />
          {data.errors?.keywords ? (
            <p id="keywords-error-message" className="text-red-600 text-center">
              {data.errors.keywords}
            </p>
          ) : null}
        </div>
        <button type="submit">Submit Recording</button>
      </Form>
    </div>
  ) : null
}

export default function RecordScreen() {
  const [audio, setAudio] = React.useState<Blob | null>(null)
  return (
    <div>
      {audio ? (
        <SubmitRecordingForm audio={audio} />
      ) : (
        <CallRecorder onRecordingComplete={recording => setAudio(recording)} />
      )}
    </div>
  )
}
