import {redirect, createCookieSessionStorage, Headers} from 'remix'
import type {Request, ResponseInit} from 'remix'
import {getRequiredServerEnvVar} from '../utils/misc'
import {handleFormSubmission} from '../utils/actions.server'
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
      _redirect: () => null,
      firstName: getErrorForFirstName,
      email: getErrorForEmail,
      convertKitTagId: getConvertKitTagIdError,
      convertKitFormId: getConvertKitFormIdError,
    },
    handleFormValues: async formData => {
      const {firstName, email, convertKitTagId, convertKitFormId, _redirect} =
        formData

      if (convertKitFormId) {
        await ck.addSubscriberToForm({email, firstName, convertKitFormId})
      }
      if (convertKitTagId) {
        await ck.addTagToSubscriber({email, firstName, convertKitTagId})
      }

      session.flashData({fields: {firstName, email}, status: 'success'})

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
