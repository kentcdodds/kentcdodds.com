import * as React from 'react'
import {Form, useActionData} from 'remix'
import {useOptionalUser, useOptionalUserInfo} from '../utils/providers'
import {ArrowButton} from '../components/arrow-button'
import {Field} from '../components/form-elements'
import {CheckIcon} from '../components/icons/check-icon'
import type {ActionData} from './types'

function ConvertKitForm({
  convertKitTagId,
  convertKitFormId,
}:
  | {convertKitTagId?: never; convertKitFormId: string}
  | {convertKitTagId: string; convertKitFormId?: never}
  | {convertKitTagId: string; convertKitFormId: string}) {
  const user = useOptionalUser()
  const userInfo = useOptionalUserInfo()

  const submissionKey = 'convertkitform'

  const actionData = useActionData<ActionData>(submissionKey)
  return (
    <div>
      {actionData?.state === 'success' ? (
        <div className="flex">
          <CheckIcon />
          <span>
            {userInfo?.convertKit?.isInMailingList
              ? `Sweet, you're all set`
              : `Sweet, check your email for confirmation.`}
          </span>
        </div>
      ) : (
        <Form
          replace={true}
          className="mt-8 space-y-4"
          method="post"
          noValidate
          submissionKey={submissionKey}
        >
          <input type="hidden" name="convertKitTagId" value={convertKitTagId} />
          <input
            type="hidden"
            name="convertKitFormId"
            value={convertKitFormId}
          />
          <Field
            name="firstName"
            label="First name"
            error={actionData?.errors.firstName}
            autoComplete="firstName"
            defaultValue={actionData?.fields.firstName ?? user?.firstName}
            required
          />

          <Field
            name="email"
            label="Email"
            autoComplete="email"
            error={actionData?.errors.email}
            defaultValue={actionData?.fields.email ?? user?.email}
          />

          <ArrowButton className="pt-4" type="submit" direction="right">
            Sign me up
          </ArrowButton>
        </Form>
      )}
    </div>
  )
}

export {ConvertKitForm}
