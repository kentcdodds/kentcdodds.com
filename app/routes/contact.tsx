import {Form, json, redirect, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import * as React from 'react'
import {getErrorMessage, getNonNull} from '../utils/misc'
import {useOptionalUser} from '../utils/providers'
import {sendEmail} from '../utils/send-email.server'
import {contactStorage} from '../utils/contact.server'
import {HeroSection} from '../components/sections/hero-section'
import {images} from '../images'
import {H2} from '../components/typography'
import {ButtonGroup, ErrorPanel, Field} from '../components/form-elements'
import {Button} from '../components/button'
import {Grid} from '../components/grid'

const errorSessionKey = 'contact_error'
const fieldsSessionKey = 'contact_fields'
const stateSessionKey = 'contact_state'

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
  const session = await contactStorage.getSession(request.headers.get('Cookie'))

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
          'Set-Cookie': await contactStorage.commitSession(session),
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

    // I tried using session.unset, but that didn't work... This did... 🤷‍♂️
    session.set(fieldsSessionKey, {})
    session.set(errorSessionKey, {})
    session.flash(stateSessionKey, 'success')
    return redirect('/contact', {
      headers: {
        'Set-Cookie': await contactStorage.commitSession(session),
      },
    })
  } catch (error: unknown) {
    session.flash(errorSessionKey, {generalError: getErrorMessage(error)})
    return redirect('/contact', {
      headers: {
        'Set-Cookie': await contactStorage.commitSession(session),
      },
    })
  }
}

type LoaderData = {
  state: 'success' | null
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
  const session = await contactStorage.getSession(request.headers.get('Cookie'))
  const values: LoaderData = {
    state: session.get(stateSessionKey),
    fields: session.get(fieldsSessionKey),
    errors: session.get(errorSessionKey),
  }
  return json(values, {
    headers: {
      'Set-Cookie': await contactStorage.commitSession(session),
    },
  })
}

export default function ContactRoute() {
  const data = useRouteData<LoaderData>()
  const user = useOptionalUser()

  return (
    <div>
      <HeroSection
        title="Send me an email."
        subtitle="Like in the old days."
        image={
          <img
            className="rounded-br-[25%] rounded-tl-[25%] max-h-50vh rounded-bl-3xl rounded-tr-3xl"
            src={images.kentProfile()}
            alt={images.kentProfile.alt}
          />
        }
      />

      <Form method="post" noValidate>
        <Grid>
          <div className="col-span-full mb-12 lg:col-span-8 lg:col-start-3">
            <H2>Contact Kent C. Dodds</H2>
          </div>

          <div className="col-span-full lg:col-span-8 lg:col-start-3">
            <Field
              name="name"
              label="Name"
              placeholder="Person Doe"
              defaultValue={data.fields?.name ?? user?.firstName ?? ''}
              error={data.errors?.name}
            />
            <Field
              type="email"
              label="Email"
              placeholder="person.doe@example.com"
              defaultValue={data.fields?.email ?? user?.email ?? ''}
              name="email"
              error={data.errors?.email}
            />
            <Field
              name="subject"
              label="Subject"
              placeholder="No subject"
              defaultValue={data.fields?.subject ?? ''}
              error={data.errors?.subject}
            />
            <Field
              name="body"
              label="Body"
              type="textarea"
              placeholder="A clear and concise message works wonders."
              rows={8}
              defaultValue={data.fields?.body ?? ''}
              error={data.errors?.body}
            />

            <ButtonGroup>
              {data.state === 'success' ? (
                <Button type="submit" disabled>
                  Hooray, email sent!{' '}
                  <span role="img" aria-label="party popper emoji">
                    🎉
                  </span>
                </Button>
              ) : (
                <Button type="submit">Send message</Button>
              )}
              <Button variant="secondary" type="reset">
                Reset form
              </Button>
            </ButtonGroup>

            {data.errors?.generalError ? (
              <ErrorPanel>{data.errors.generalError}</ErrorPanel>
            ) : null}
          </div>
        </Grid>
      </Form>
    </div>
  )
}
