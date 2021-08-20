import * as React from 'react'
import type {ActionFunction} from 'remix'
import {redirect} from 'remix'
import {sendEmail} from '~/utils/send-email.server'
import {Button} from '~/components/button'
import {ButtonGroup} from '~/components/form-elements'
import type {ActionData} from '~/utils/contact'
import {
  getErrorForName,
  getErrorForBody,
  getErrorForEmail,
  getErrorForSubject,
} from '~/utils/contact'
import {handleFormSubmission} from '~/utils/actions.server'

export const action: ActionFunction = async ({request}) => {
  return handleFormSubmission<ActionData>({
    request,
    validators: {
      name: getErrorForName,
      email: getErrorForEmail,
      subject: getErrorForSubject,
      body: getErrorForBody,
    },
    handleFormValues: async formData => {
      const {name, email, subject, body} = formData

      const sender = `"${name}" <${email}>`

      await sendEmail({
        from: sender,
        to: `"Kent C. Dodds" <me@kentcdodds.com>`,
        subject,
        text: body,
      })

      return redirect('/contact/success')
    },
  })
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
