import * as React from 'react'
import type {ActionFunction} from 'remix'
import {json, redirect} from 'remix'
import {getErrorMessage, getNonNull} from '../../utils/misc'
import {sendEmail} from '../../utils/send-email.server'
import {Button} from '../../components/button'
import {ButtonGroup} from '../../components/form-elements'
import type {ActionData} from '../../utils/contact'
import {
  getErrorForName,
  getErrorForBody,
  getErrorForEmail,
  getErrorForSubject,
} from '../../utils/contact'

export const action: ActionFunction = async ({request}) => {
  const actionData: ActionData = {fields: {}, errors: {}}

  try {
    const requestText = await request.text()
    const form = new URLSearchParams(requestText)

    actionData.fields = {
      name: form.get('name'),
      email: form.get('email'),
      subject: form.get('subject'),
      body: form.get('body'),
    }

    actionData.errors = {
      name: getErrorForName(actionData.fields.name),
      email: getErrorForEmail(actionData.fields.email),
      subject: getErrorForSubject(actionData.fields.subject),
      body: getErrorForBody(actionData.fields.body),
    }

    if (Object.values(actionData.errors).some(err => err !== null)) {
      return json(actionData, 401)
    }

    const {name, email, subject, body} = getNonNull(actionData.fields)

    const sender = `"${name}" <${email}>`

    await sendEmail({
      from: sender,
      to: `"Kent C. Dodds" <me@kentcdodds.com>`,
      subject,
      text: body,
    })

    return redirect('/contact/success')
  } catch (error: unknown) {
    actionData.errors.generalError = getErrorMessage(error)
    return json({errors: {generalError: getErrorMessage(error)}}, 500)
  }
}

export default function IncompleteFormSubmitButton() {
  return (
    <ButtonGroup>
      <Button type="submit">Send message</Button>
      <Button variant="secondary" type="reset">
        Reset form
      </Button>
    </ButtonGroup>
  )
}
