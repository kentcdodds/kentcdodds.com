import * as React from 'react'
import {useSubmit, redirect, Form, json, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import {CallRecorder} from '../components/call-recorder'
import {getDb} from '../utils/firebase.server'
import {requireUser, rootStorage} from '../utils/session.server'

function validateDescription(description: string | null) {
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

function validateTitle(title: string | null) {
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

function assertNonNull<ValueType>(
  value: ValueType,
  message: string,
): asserts value is Exclude<ValueType, null> {
  if (value === null) throw new Error(message)
}

export const action: ActionFunction = async ({request}) => {
  return requireUser(request)(async ({userDoc}) => {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    const requestText = await request.text()
    const body = new URLSearchParams(requestText)
    const audio = body.get('audio')
    const title = body.get('title')
    const description = body.get('description')

    const titleError = validateTitle(title)
    const descriptionError = validateDescription(description)
    const audioError = audio ? null : 'Audio file is required'

    if (titleError || descriptionError || audioError) {
      if (titleError) session.flash('titleError', titleError)
      if (descriptionError) session.flash('descriptionError', descriptionError)
      if (audioError) session.flash('audioError', audioError)

      return redirect('/call', {
        headers: {
          'Set-Cookie': await rootStorage.commitSession(session),
        },
      })
    }
    assertNonNull(audio, 'audio should not be null here')
    assertNonNull(title, 'title should not be null here')
    assertNonNull(description, 'description should not be null here')

    const call = {
      title,
      description,
      userId: `/users/${userDoc.id}`,
      base64: audio,
    }
    const callsRef = getDb().collection('calls')
    await callsRef.add(call)
    return redirect('/listen')
  })
}

export const loader: LoaderFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const data = {
    audioError: session.get('audioError'),
    titleError: session.get('titleError'),
    descriptionError: session.get('descriptionError'),
  }
  return json(data, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
  })
}

export default function CallInPodcastScreen() {
  console.log('rendering screen')
  const [audio, setAudio] = React.useState<Blob | null>(null)
  return (
    <div>
      <h1>Welcome to the Call Kent Podcast</h1>
      <hr />
      {audio ? (
        <SubmitRecordingForm audio={audio} />
      ) : (
        <CallRecorder onRecordingComplete={recording => setAudio(recording)} />
      )}
    </div>
  )
}

function SubmitRecordingForm({audio}: {audio: Blob}) {
  const data = useRouteData()
  console.log(data)
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
      {data.audioError ? (
        <p id="audio-error-message" className="text-center text-red-600">
          {data.audioError}
        </p>
      ) : null}
      <Form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            aria-describedby="title-error-message"
            defaultValue="Testing this thing"
          />
          {data.titleError ? (
            <p id="title-error-message" className="text-center text-red-600">
              {data.titleError}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue="This is the default value just for testing"
          />
          {data.descriptionError ? (
            <p
              id="description-error-message"
              className="text-center text-red-600"
            >
              {data.descriptionError}
            </p>
          ) : null}
        </div>
        <button type="submit">Submit Recording</button>
      </Form>
    </div>
  ) : null
}
