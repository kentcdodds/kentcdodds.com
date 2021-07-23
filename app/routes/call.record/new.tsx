import * as React from 'react'
import {redirect, json, useActionData} from 'remix'
import type {ActionFunction} from 'remix'
import {CallRecorder} from '../../components/call/recorder'
import {
  RecordingForm,
  RecordingFormData,
} from '../../components/call/submit-recording-form'
import {requireUser} from '../../utils/session.server'
import {prisma} from '../../utils/prisma.server'
import {getErrorMessage, getNonNull} from '../../utils/misc'
import {
  getErrorForAudio,
  getErrorForTitle,
  getErrorForDescription,
  getErrorForKeywords,
} from '../../utils/call-kent'

export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
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
      actionData.errors.generalError = getErrorMessage(error)
      return json(actionData, 500)
    }
  })
}

type ActionData = RecordingFormData

export default function RecordScreen() {
  const actionData = useActionData() as ActionData | undefined
  const [audio, setAudio] = React.useState<Blob | null>(null)
  return (
    <div>
      {audio ? (
        <RecordingForm audio={audio} data={actionData} />
      ) : (
        <CallRecorder onRecordingComplete={recording => setAudio(recording)} />
      )}
    </div>
  )
}
