import {redirect, createCookieSessionStorage, Headers} from 'remix'
import type {Request, ResponseInit} from 'remix'
import {getRequiredServerEnvVar} from '../utils/misc'
import {handleFormSubmission} from '../utils/actions.server'
import {deleteConvertKitCache} from '../utils/user-info.server'
import * as ck from './convertkit.server'
import type {ActionData, LoaderData} from './types'

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
  {convertKitFormId}: ActionData['fields'],
) {
  if (!convertKitFormId && !tagId) {
    return `convertKitTagId is required if convertKitFormId is not specified`
  }
  if (!tagId) return null
  if (tagId.length < 2) return `Convert Kit Tag ID is incorrect`
  return null
}

function getErrorForConvertKitFormId(
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

function getErrorForFormId(value: string | null) {
  if (!value) return `Form ID is required`
  return null
}

const storage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_convert_kit',
    secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
    sameSite: 'lax',
    path: '/',
    maxAge: 10,
  },
})

async function getSession(request: Request) {
  const session = await storage.getSession(request.headers.get('Cookie'))
  const initialValue = await storage.commitSession(session)

  const commit = async () => {
    const currentValue = await storage.commitSession(session)
    return currentValue === initialValue ? null : currentValue
  }
  return {
    getData: () => session.get('data') as LoaderData | null,
    flashData: (data: LoaderData) => session.flash('data', data),
    commit,
    getHeaders: async (headers: ResponseInit['headers'] = new Headers()) => {
      const value = await commit()
      if (!value) return headers
      if (headers instanceof Headers) {
        headers.append('Set-Cookie', value)
      } else if (Array.isArray(headers)) {
        headers.push(['Set-Cookie', value])
      } else {
        headers['Set-Cookie'] = value
      }
      return headers
    },
  }
}

async function handleConvertKitFormSubmission(request: Request) {
  const session = await getSession(request)

  return handleFormSubmission<ActionData>({
    request,
    validators: {
      formId: getErrorForFormId,
      _redirect: () => null,
      firstName: getErrorForFirstName,
      email: getErrorForEmail,
      convertKitTagId: getErrorForConvertKitTagId,
      convertKitFormId: getErrorForConvertKitFormId,
    },
    handleFormValues: async formData => {
      const {
        firstName,
        email,
        convertKitTagId,
        convertKitFormId,
        _redirect,
        formId,
      } = formData

      let subscriberId: number | null = null
      if (convertKitFormId) {
        const subscriber = await ck.addSubscriberToForm({
          email,
          firstName,
          convertKitFormId,
        })
        subscriberId = subscriber.id
      }
      if (convertKitTagId) {
        const subscriber = await ck.addTagToSubscriber({
          email,
          firstName,
          convertKitTagId,
        })
        subscriberId = subscriber.id
      }

      if (subscriberId) {
        await deleteConvertKitCache(subscriberId)
      }

      session.flashData({fields: {formId, firstName, email}, status: 'success'})

      return redirect(_redirect || '/', {
        headers: await session.getHeaders(),
      })
    },
  })
}

async function getConvertKitFormLoaderData(request: Request) {
  const session = await getSession(request)
  return session.getData() ?? null
}

export {
  handleConvertKitFormSubmission,
  getSession as getConvertKitFormSession,
  getConvertKitFormLoaderData,
}
