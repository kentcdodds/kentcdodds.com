import * as React from 'react'
import {Form, useSubmit} from 'remix'
import {Input, InputError, Label} from '../form-elements'
import {Grid} from '../grid'
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

function RecordingForm({audio, data}: {audio: Blob; data?: RecordingFormData}) {
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
      <div className="mb-12">
        {data?.errors.generalError ? (
          <p id="audio-error-message" className="text-red-600 text-center">
            {data.errors.generalError}
          </p>
        ) : null}
        {audioURL ? (
          <audio
            src={audioURL}
            controls
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
        <Grid nested>
          <div className="flex flex-col col-span-full space-y-12 lg:col-span-6 lg:space-y-20">
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <Label htmlFor="title">Title</Label>
                <InputError id="firstName-error">
                  {data?.errors.title}
                </InputError>
              </div>

              <Input
                id="title"
                name="title"
                aria-describedby="title-error-message"
                defaultValue={data?.fields.title ?? ''}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-4">
                <Label htmlFor="description">Description</Label>
                <InputError id="description-error-message">
                  {data?.errors.description}
                </InputError>
              </div>

              <Input
                id="description"
                name="description"
                type="textarea"
                aria-describedby="description-error-message"
                defaultValue={data?.fields.description ?? ''}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-4">
                <Label htmlFor="keywords">Keywords</Label>
                <InputError id="keywords-error-message">
                  {data?.errors.keywords}
                </InputError>
              </div>

              <Input
                id="keywords"
                name="keywords"
                aria-describedby="keywords-error-message"
                defaultValue={data?.fields.keywords ?? ''}
              />
            </div>
            <Button type="submit">Submit Recording</Button>
          </div>
        </Grid>
      </Form>
    </div>
  )
}

export type {RecordingFormData}
export {RecordingForm}
