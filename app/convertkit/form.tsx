import * as React from 'react'
import {Form, useActionData} from 'remix'
import {useLocation} from 'react-router-dom'
import {
  useOptionalUser,
  useOptionalUserInfo,
  createSimpleContext,
} from '../utils/providers'
import {ArrowButton} from '../components/arrow-button'
import {Field} from '../components/form-elements'
import {CheckIcon} from '../components/icons/check-icon'
import type {ActionData, LoaderData} from './types'

const {Provider: ConvertKitDataProvider, useOptionalValue: useConvertKitData} =
  createSimpleContext<LoaderData | null>('Workshops')

function ConvertKitForm({
  formId,
  convertKitTagId,
  convertKitFormId,
}: {formId: string} & (
  | {convertKitTagId?: never; convertKitFormId: string}
  | {convertKitTagId: string; convertKitFormId?: never}
  | {convertKitTagId: string; convertKitFormId: string}
)) {
  const user = useOptionalUser()
  const userInfo = useOptionalUserInfo()
  const location = useLocation()
  let redirect = location.pathname
  if (location.search) {
    redirect = `${redirect}?${location.search}`
  }
  if (location.hash) {
    redirect = `${redirect}#${location.hash}`
  }

  const submissionKey = 'convertkitform'

  const actionData = useActionData<ActionData>(submissionKey)
  const loaderData = useConvertKitData()

  const convertKitData =
    loaderData?.status === 'success' && loaderData.fields.formId === formId
      ? loaderData
      : null

  const errors = convertKitData ? {} : actionData?.errors ?? {}
  const fields = convertKitData
    ? convertKitData.fields
    : actionData?.fields ?? {}
  const alreadySubscribed = userInfo?.convertKit?.tags.some(
    ({id}) => id === convertKitTagId,
  )

  if (alreadySubscribed) {
    return (
      <div>{`Actually, it looks like you're already signed up to be notified.`}</div>
    )
  }

  return (
    <div>
      {convertKitData ? (
        <div className="flex">
          <CheckIcon />
          <p className="text-secondary">
            {userInfo?.convertKit?.isInMailingList
              ? `Sweet, you're all set`
              : `Sweet, check your email for confirmation.`}
          </p>
        </div>
      ) : (
        <Form
          replace={true}
          action="/_action/convert-kit"
          className="mt-8 space-y-4"
          method="post"
          noValidate
          submissionKey={submissionKey}
        >
          <input type="hidden" name="formId" value={formId} />
          <input type="hidden" name="_redirect" value={redirect} />
          <input type="hidden" name="convertKitTagId" value={convertKitTagId} />
          <input
            type="hidden"
            name="convertKitFormId"
            value={convertKitFormId}
          />
          <Field
            name="firstName"
            label="First name"
            error={errors.firstName}
            autoComplete="firstName"
            defaultValue={fields.firstName ?? user?.firstName}
            required
          />

          <Field
            name="email"
            label="Email"
            autoComplete="email"
            error={errors.email}
            defaultValue={fields.email ?? user?.email}
          />

          <ArrowButton className="pt-4" type="submit" direction="right">
            Sign me up
          </ArrowButton>
        </Form>
      )}
    </div>
  )
}

export {ConvertKitForm, ConvertKitDataProvider, useConvertKitData}
