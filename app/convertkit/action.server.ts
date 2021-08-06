import {json} from 'remix'
import type {Request} from 'remix'
import {handleFormSubmission} from '../utils/actions.server'
import * as ck from './convertkit.server'
import type {ActionData} from './types'

function getErrorForFirstName(name: string | null) {
  if (!name) return `Name is required`
  if (name.length > 60) return `Name is too long`
  return null
}

function getErrorForEmail(email: string | null) {
  if (!email) return `Email is required`
  if (!/^.+@.+\..+$/.test(email)) return `That's not an email`
  return null
}

function getConvertKitTagIdError(
  tagId: string | null,
  {convertKitFormId}: ActionData['fields'],
) {
  if (!convertKitFormId && !tagId) {
    return `convertKitTagId is required if convertKitFormId is not specified`
  }
  if (!tagId) return null
  if (tagId.length < 2) return `Convert Kit Tag ID is incorrect`
  return null
}

function getConvertKitFormIdError(
  formId: string | null,
  {convertKitTagId}: ActionData['fields'],
) {
  if (!convertKitTagId && !formId) {
    return `convertKitFormId is required if convertKitTagId is not specified`
  }
  if (!formId) return null
  if (formId.length < 2) return `Convert Kit Form ID is incorrect`
  return null
}

async function handleConvertKitFormSubmission(request: Request) {
  const actionData: ActionData = {
    state: 'error',
    fields: {
      firstName: '',
      email: '',
      convertKitFormId: '',
      convertKitTagId: '',
    },
    errors: {},
  }

  return handleFormSubmission<ActionData>({
    request,
    actionData,
    validators: {
      firstName: getErrorForFirstName,
      email: getErrorForEmail,
      convertKitTagId: getConvertKitTagIdError,
      convertKitFormId: getConvertKitFormIdError,
    },
    handleFormValues: async formData => {
      const {firstName, email, convertKitTagId, convertKitFormId} = formData

      if (convertKitFormId) {
        await ck.addSubscriberToForm({email, firstName, convertKitFormId})
      }
      if (convertKitTagId) {
        await ck.addTagToSubscriber({email, firstName, convertKitTagId})
      }

      actionData.state = 'success'
      return json(actionData)
    },
  })
}

export {handleConvertKitFormSubmission}
