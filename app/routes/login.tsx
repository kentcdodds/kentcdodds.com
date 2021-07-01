import * as React from 'react'
import type {ActionFunction, LoaderFunction} from 'remix'
import {Form, useRouteData, json, redirect} from 'remix'
import {getDomainUrl} from '../utils/misc'
import {
  sendToken,
  getUser,
  rootStorage,
  signOutSession,
} from '../utils/session.server'
import {Grid} from '../components/grid'
import {images} from '../images'
import {H2, Paragraph} from '../components/typography'
import {Button} from '../components/button'
import {Input, InputError, Label} from '../components/form-elements'

export const loader: LoaderFunction = async ({request}) => {
  const userInfo = await getUser(request)
  if (userInfo) return redirect('/me')

  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  await signOutSession(session)

  return json(
    {
      error: session.get('error'),
      message: session.get('message'),
    },
    {headers: {'Set-Cookie': await rootStorage.commitSession(session)}},
  )
}

const EMAIL_SENT_MESSAGE = 'Email sent.'

export const action: ActionFunction = async ({request}) => {
  const params = new URLSearchParams(await request.text())
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const emailAddress = params.get('email')
  if (!emailAddress?.match(/.+@.+/)) {
    session.flash('error', 'A valid email is required')
    const cookie = await rootStorage.commitSession(session)
    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  }

  try {
    const domainUrl = getDomainUrl(request)
    await sendToken({emailAddress, domainUrl})
    session.flash('message', EMAIL_SENT_MESSAGE)
    session.set('email', emailAddress)
    const cookie = await rootStorage.commitSession(session)
    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  } catch (e: unknown) {
    let message = 'Unknown error'
    if (e instanceof Error) {
      message = e.message
    }
    session.flash('error', message)
    const cookie = await rootStorage.commitSession(session)

    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  }
}

function Login() {
  const data = useRouteData()
  const emailSent = data.message === EMAIL_SENT_MESSAGE

  const [formValues, setFormValues] = React.useState({
    email: '',
  })

  const formIsValid = formValues.email.match(/.+@.+/)

  return (
    <Grid className="mt-12">
      <div className="col-span-full items-start overflow-visible lg:col-span-6 lg:col-start-7">
        <img
          src={images.skis.src}
          alt={images.skis.alt}
          className="mb-10 lg:mb-0"
        />
      </div>

      <div className="flex flex-col col-span-full lg:col-span-5 lg:row-start-1">
        <H2 className="mb-2">Log in to your account.</H2>
        <H2 className="mb-12 lg:mb-20" variant="secondary" as="p">
          Or sign up for an account.
        </H2>

        <div>
          <Form
            onChange={event => {
              const form = event.currentTarget
              setFormValues({email: form.email.value})
            }}
            action="/login"
            method="post"
            className="mb-10 lg:mb-12"
          >
            <div className="mb-6">
              <div className="flex flex-wrap items-baseline justify-between mb-4">
                <Label htmlFor="email-address">Email address</Label>
                {emailSent ? (
                  <p
                    id="success-message"
                    className="dark:text-blueGray-500 text-gray-500 text-lg"
                  >
                    Thanks! A magic link has been sent.{' '}
                    <span role="img" aria-label="sparkles">
                      ✨
                    </span>
                  </p>
                ) : (
                  <InputError id="error-message">{data.error}</InputError>
                )}
              </div>

              <Input
                autoFocus
                aria-describedby={
                  data.error ? 'error-message' : 'success-message'
                }
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={data.email}
                required
                placeholder="Email address"
              />
            </div>

            <Button type="submit" disabled={!formIsValid}>
              Email a login link
            </Button>

            <div className="sr-only" aria-live="polite">
              {formIsValid
                ? 'Sign in form is now valid and ready to submit'
                : 'Sign in form is now invalid.'}
            </div>
          </Form>

          <Paragraph className="mb-10">
            To sign in to your account or to create a new one fill in your email
            above and we’ll send you an email with a magic link to get you
            started.
          </Paragraph>
          {/* TODO: remove notice */}
          <p className="text-red-500 text-xs font-medium tracking-wider">
            NOTICE: Any and all of your data may get deleted at any time during
            development of the new site.
          </p>
        </div>
      </div>
    </Grid>
  )
}

export default Login
