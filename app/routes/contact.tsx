import {Form, json, redirect, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import * as React from 'react'
import {contactDataSessionKey} from '../utils/contact'
import type {ContactData} from '../utils/contact'
import {getErrorMessage, getNonNull, useOptionalUser} from '../utils/misc'
import {rootStorage} from '../utils/session.server'
import {sendEmail} from '../utils/send-email.server'

const errorSessionKey = 'contact_error'
const fieldsSessionKey = 'contact_fields'

function getErrorForName(name: string | null) {
  if (!name) return `Name is required`
  if (name.length > 60) return `Name is too long`
  return null
}

function getErrorForEmail(email: string | null) {
  if (!email) return `Email is required`
  if (!/^.+@.+\..+$/.test(email)) return `That's not an email`
  return null
}

function getErrorForSubject(subject: string | null) {
  if (!subject) return `Subject is required`
  if (subject.length <= 5) return `Subject is too short`
  if (subject.length > 120) return `Subject is too long`
  return null
}

function getErrorForBody(body: string | null) {
  if (!body) return `Body is required`
  if (body.length <= 40) return `Body is too short`
  if (body.length > 1001) return `Body is too long`
  return null
}

export const action: ActionFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))

  try {
    const requestText = await request.text()
    const form = new URLSearchParams(requestText)

    const formData = {
      name: form.get('name'),
      email: form.get('email'),
      subject: form.get('subject'),
      body: form.get('body'),
    }
    session.flash(fieldsSessionKey, formData)

    const errors = {
      name: getErrorForName(formData.name),
      email: getErrorForEmail(formData.email),
      subject: getErrorForSubject(formData.subject),
      body: getErrorForBody(formData.body),
    }

    if (errors.name || errors.email || errors.subject || errors.body) {
      session.flash(errorSessionKey, errors)
      return redirect('/contact', {
        headers: {
          'Set-Cookie': await rootStorage.commitSession(session),
        },
      })
    }

    const {name, email, subject, body} = getNonNull(formData)

    const sender = `"${name}" <${email}>`

    await sendEmail({
      from: sender,
      to: `"Kent C. Dodds" <me@kentcdodds.com>`,
      subject,
      text: body,
    })

    session.unset(fieldsSessionKey)
    const contactData: ContactData = {name, email, subject}
    session.flash(contactDataSessionKey, contactData)
    return redirect('/contact/success', {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  } catch (error: unknown) {
    session.flash(errorSessionKey, {generalError: getErrorMessage(error)})
    return redirect('/contact', {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  }
}

type LoaderData = {
  fields?: {
    name: string | null
    email: string | null
    subject: string | null
    body: string | null
  }
  errors?: {
    generalError?: string
    name: string | null
    email: string | null
    subject: string | null
    body: string | null
  }
}

export const loader: LoaderFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const values: LoaderData = {
    fields: session.get(fieldsSessionKey),
    errors: session.get(errorSessionKey),
  }
  return json(values, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
  })
}

export default function ContactRoute() {
  const data = useRouteData<LoaderData>()
  const user = useOptionalUser()
  return (
    <div>
      <h2>Contact Kent</h2>
      <Form method="post" noValidate>
        <div>
          <label htmlFor="contact-name">Name</label>
          <input
            name="name"
            id="contact-name"
            aria-describedby="name-error"
            defaultValue={data.fields?.name ?? user?.firstName ?? ''}
          />
          {data.errors?.name ? (
            <div
              role="alert"
              className="dark:text-red-300 text-red-800"
              id="name-error"
            >
              {data.errors.name}
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="contact-email">Email</label>
          <input
            name="email"
            id="contact-email"
            type="email"
            aria-describedby="email-error"
            defaultValue={data.fields?.email ?? user?.email ?? ''}
          />
          {data.errors?.email ? (
            <div
              role="alert"
              className="dark:text-red-300 text-red-800"
              id="email-error"
            >
              {data.errors.email}
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="contact-subject">Subject</label>
          <input
            name="subject"
            id="contact-subject"
            aria-describedby="subject-error"
            defaultValue={data.fields?.subject ?? ''}
          />
          {data.errors?.subject ? (
            <div
              role="alert"
              className="dark:text-red-300 text-red-800"
              id="subject-error"
            >
              {data.errors.subject}
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="contact-body">Body</label>
          <textarea
            name="body"
            id="contact-body"
            aria-describedby="body-error"
            defaultValue={data.fields?.body ?? ''}
          />
          {data.errors?.body ? (
            <div
              role="alert"
              className="dark:text-red-300 text-red-800"
              id="body-error"
            >
              {data.errors.body}
            </div>
          ) : null}
        </div>
        <div>
          <input type="submit" />
        </div>
        {data.errors?.generalError ? (
          <div role="alert" className="dark:text-red-300 text-red-800">
            {data.errors.generalError}
          </div>
        ) : null}
      </Form>
    </div>
  )
}
