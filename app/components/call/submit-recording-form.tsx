import * as React from 'react'
import {Form, useSubmit} from 'remix'

type RecordingFormData = {
  fields?: {
    // audio is too big to include in the session
    // hopefully it won't matter with fully client-side interactions though
    audio?: never
    title: string | null
    description: string | null
    keywords: string | null
  }
  errors?: {
    generalError?: string
    audio: string | null
    title: string | null
    description: string | null
    keywords: string | null
  }
}

function RecordingForm({audio, data}: {audio: Blob; data: RecordingFormData}) {
  const audioURL = React.useMemo(() => {
    return window.URL.createObjectURL(audio)
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

  return (
    <div>
      {data.errors?.generalError ? (
        <p id="audio-error-message" className="text-red-600 text-center">
          {data.errors.generalError}
        </p>
      ) : null}
      {audioURL ? (
        <audio src={audioURL} controls aria-describedby="audio-error-message" />
      ) : (
        'loading...'
      )}
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
  )
}

export type {RecordingFormData}
export {RecordingForm}
