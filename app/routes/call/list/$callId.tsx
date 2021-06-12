import * as React from 'react'
import {useSubmit, redirect, Form, json, useRouteData, Link} from 'remix'
import type {Call, KCDAction, KCDLoader} from 'types'
import {CallRecorder} from '../../../components/call-recorder'
import {requireAdminUser, rootStorage} from '../../../utils/session.server'
import {prisma} from '../../../utils/prisma.server'
import {getErrorMessage, getNonNull} from '../../../utils/misc'
import {createEpisodeAudio} from '../../../utils/ffmpeg.server'
import {createEpisode} from '../../../utils/transitor.server'

const errorSessionKey = 'call_error'
const fieldsSessionKey = 'call_fields'

function getErrorForDescription(description: string | null) {
  if (!description) return `Description is required`

  const minLength = 20
  const maxLength = 1000
  if (description.length < minLength) {
    return `Description must be at least ${minLength} characters`
  }
  if (description.length > maxLength) {
    return `Description must be no longer than ${maxLength} characters`
  }
  return null
}

function getErrorForTitle(title: string | null) {
  if (!title) return `Title is required`

  const minLength = 5
  const maxLength = 100
  if (title.length < minLength) {
    return `Title must be at least ${minLength} characters`
  }
  if (title.length > maxLength) {
    return `Title must be no longer than ${maxLength} characters`
  }
  return null
}

function getErrorForAudio(audio: string | null) {
  if (!audio) return 'Audio file is required'
  return null
}

export const action: KCDAction<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request)(async () => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const maybeNullCall = await prisma.call.findFirst({
      where: {id: params.callId},
    })
    try {
      const requestText = await request.text()
      const form = new URLSearchParams(requestText)

      const formData = {
        audio: form.get('audio'),
        title: form.get('title'),
        description: form.get('description'),
      }
      const fields: LoaderData['fields'] = {
        title: formData.title,
        description: formData.description,
      }
      session.flash(fieldsSessionKey, fields)

      const errors = {
        generalError: maybeNullCall
          ? undefined
          : `No call with the ID ${params.callId} found.`,
        audio: getErrorForAudio(formData.audio),
        title: getErrorForTitle(formData.title),
        description: getErrorForDescription(formData.description),
      }

      if (errors.title || errors.description || errors.audio) {
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
        call,
      } = getNonNull({
        ...formData,
        call: maybeNullCall,
      })

      const episodeAudio = await createEpisodeAudio(call.base64, response)
      await createEpisode({audio: episodeAudio, title, description})

      console.log({title, description})
      // await prisma.call.create({data: call})

      return redirect(new URL(request.url).pathname)
    } catch (error: unknown) {
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
}

type LoaderData = {
  call: Call | null
  fields?: {
    // audio is too big to include in the session
    // hopefully it won't matter with fully client-side interactions though
    audio?: never
    title: string | null
    description: string | null
  }
  errors?: {
    generalError?: string
    audio: string | null
    title: string | null
    description: string | null
  }
}

export const loader: KCDLoader<{callId: string}> = async ({
  request,
  params,
}) => {
  return requireAdminUser(request)(async () => {
    const call = await prisma.call.findFirst({where: {id: params.callId}})
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const fields: LoaderData['fields'] = {
      title: call?.title,
      description: call?.description,
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

function SubmitRecordingForm({response}: {response: Blob}) {
  const data = useRouteData<LoaderData>()

  const audioURL = React.useMemo(() => {
    return window.URL.createObjectURL(response)
  }, [response])

  const submit = useSubmit()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const reader = new FileReader()
    reader.readAsDataURL(response)
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

  return (
    <div>
      {data.errors?.generalError ? (
        <p id="audio-error-message" className="text-center text-red-600">
          {data.errors.generalError}
        </p>
      ) : null}
      {audioURL ? (
        <audio src={audioURL} controls aria-describedby="audio-error-message" />
      ) : (
        'loading...'
      )}
      {data.errors?.audio ? (
        <p id="audio-error-message" className="text-center text-red-600">
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
            <p id="title-error-message" className="text-center text-red-600">
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
              className="text-center text-red-600"
            >
              {data.errors.description}
            </p>
          ) : null}
        </div>
        <button type="submit">Submit Recording</button>
      </Form>
    </div>
  )
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
        <SubmitRecordingForm response={responseAudio} />
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
