import * as React from 'react'
import {Form, useSubmit} from '@remix-run/react'
import {useRootData} from '~/utils/use-root-data'
import {Field} from '../form-elements'
import {Button} from '../button'

type RecordingFormData = {
  fields: {
    // audio is too big to include in the session
    // hopefully it won't matter with fully client-side interactions though
    audio?: never
    title?: string | null
    description?: string | null
    keywords?: string | null
  }
  errors: {
    generalError?: string
    audio?: string | null
    title?: string | null
    description?: string | null
    keywords?: string | null
  }
}

function RecordingForm({
  audio,
  data,
  additionalFields,
}: {
  audio: Blob
  data?: RecordingFormData
  additionalFields?: React.ReactElement
}) {
  const {
    requestInfo: {flyPrimaryInstance},
  } = useRootData()
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
          submit(form, {
            method: 'post',
            headers: flyPrimaryInstance
              ? {'fly-force-instance-id': flyPrimaryInstance}
              : undefined,
          })
        }
      },
      {once: true},
    )
  }

  return (
    <div>
      <div className="mb-12">
        {data?.errors.generalError ? (
          <p id="audio-error-message" className="text-center text-red-500">
            {data.errors.generalError}
          </p>
        ) : null}
        {audioURL ? (
          <audio
            src={audioURL}
            controls
            preload="metadata"
            aria-describedby="audio-error-message"
          />
        ) : (
          'loading...'
        )}
        {data?.errors.audio ? (
          <p id="audio-error-message" className="text-red-600 text-center">
            {data.errors.audio}
          </p>
        ) : null}
      </div>

      <Form onSubmit={handleSubmit}>
        <Field
          name="title"
          label="Title"
          defaultValue={data?.fields.title ?? ''}
          error={data?.errors.title}
        />
        <Field
          error={data?.errors.description}
          name="description"
          label="Description"
          type="textarea"
          defaultValue={data?.fields.description ?? ''}
        />

        <Field
          error={data?.errors.keywords}
          label="Keywords"
          description="comma separated values"
          name="keywords"
          defaultValue={data?.fields.keywords ?? ''}
        />

        {additionalFields}

        <Button type="submit" className="mt-8">
          Submit Recording
        </Button>
      </Form>
    </div>
  )
}

export type {RecordingFormData}
export {RecordingForm}
