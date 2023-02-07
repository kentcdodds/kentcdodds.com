import {json} from '@remix-run/node'
import {getErrorMessage} from '~/utils/misc'
import {deleteConvertKitCache} from '~/utils/user-info.server'
import * as ck from './convertkit.server'
import type {Errors, Fields, ActionData} from './types'

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

function getErrorForConvertKitTagId(
  tagId: string | null,
  form: URLSearchParams,
) {
  if (!form.get('convertKitFormId') && !tagId) {
    return `convertKitTagId is required if convertKitFormId is not specified`
  }
  if (!tagId) return null
  if (tagId.length < 2) return `Convert Kit Tag ID is incorrect`
  return null
}

function getErrorForConvertKitFormId(
  formId: string | null,
  form: URLSearchParams,
) {
  if (!form.get('convertKitTagId') && !formId) {
    return `convertKitFormId is required if convertKitTagId is not specified`
  }
  if (!formId) return null
  if (formId.length < 2) return `Convert Kit Form ID is incorrect`
  return null
}

function getErrorForFormId(value: string | null) {
  if (!value) return `Form ID is required`
  return null
}

async function handleConvertKitFormSubmission(request: Request) {
  const requestText = await request.text()
  const form = new URLSearchParams(requestText)

  const fields: Fields = {
    formId: form.get('formId') ?? '',
    firstName: form.get('firstName') ?? '',
    email: form.get('email') ?? '',
    convertKitTagId: form.get('convertKitTagId') ?? '',
    convertKitFormId: form.get('convertKitFormId') ?? '',
    url: form.get('url'),
  }

  const errors: Errors = {
    generalError: null,
    formId: getErrorForFormId(fields.formId),
    firstName: getErrorForFirstName(fields.firstName),
    email: getErrorForEmail(fields.email),
    convertKitTagId: getErrorForConvertKitTagId(fields.convertKitTagId, form),
    convertKitFormId: getErrorForConvertKitFormId(
      fields.convertKitFormId,
      form,
    ),
    url: null,
  }

  const failedHoneypot = Boolean(fields.url)
  if (failedHoneypot) {
    console.info(`FAILED HONEYPOT`, fields)
    return json({status: 'success'})
  }

  let data: ActionData

  if (Object.values(errors).some(err => err !== null)) {
    data = {status: 'error', errors}
    return json(data, 400)
  }

  try {
    let subscriberId: number | null = null
    if (fields.convertKitFormId) {
      const subscriber = await ck.addSubscriberToForm(fields)
      subscriberId = subscriber.id
    }
    if (fields.convertKitTagId) {
      const subscriber = await ck.addTagToSubscriber(fields)
      subscriberId = subscriber.id
    }

    if (subscriberId) {
      // if this errors out it's not a big deal. The cache will expire eventually
      await deleteConvertKitCache(subscriberId).catch(() => {})
    }
  } catch (error: unknown) {
    errors.generalError = getErrorMessage(error)
    data = {status: 'error', errors}
    return json(data, 500)
  }

  data = {status: 'success'}
  return json(data)
}

export {handleConvertKitFormSubmission}
