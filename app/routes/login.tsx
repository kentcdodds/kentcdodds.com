import * as React from 'react'
import type {
  ActionFunction,
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from 'remix'
import {Form, useLoaderData, json, redirect} from 'remix'
import {
  getDisplayUrl,
  getDomainUrl,
  getErrorMessage,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {sendToken, getUser} from '~/utils/session.server'
import {getLoginInfoSession} from '~/utils/login.server'
import {getGenericSocialImage, images} from '~/images'
import {Paragraph} from '~/components/typography'
import {Button, LinkButton} from '~/components/button'
import {Input, InputError, Label} from '~/components/form-elements'
import {HeroSection} from '~/components/sections/hero-section'
import {verifyEmailAddress} from '~/utils/verifier.server'
import type {LoaderData as RootLoaderData} from '../root'
import {getSocialMetas} from '~/utils/seo'
import {Grid} from '~/components/grid'

type LoaderData = {
  email?: string
  error?: string
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  if (user) return redirect('/me')

  const loginSession = await getLoginInfoSession(request)

  const data: LoaderData = {
    email: loginSession.getEmail(),
    error: loginSession.getError(),
  }

  const headers = new Headers({
    'Cache-Control': 'private, max-age=3600',
    Vary: 'Cookie',
  })
  await loginSession.getHeaders(headers)

  return json(data, {headers})
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  const domain = new URL(requestInfo.origin).host
  return {
    ...getSocialMetas({
      title: `Login to ${domain}`,
      description: `Sign up or login to ${domain} to join a team and learn together.`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.skis.id,
        words: `Login to your account on ${domain}`,
      }),
    }),
  }
}

export const action: ActionFunction = async ({request}) => {
  const params = new URLSearchParams(await request.text())
  const loginSession = await getLoginInfoSession(request)

  const emailAddress = params.get('email')
  if (emailAddress) loginSession.setEmail(emailAddress)

  if (!emailAddress?.match(/.+@.+/)) {
    loginSession.flashError('A valid email is required')
    return redirect(`/login`, {
      status: 400,
      headers: await loginSession.getHeaders(),
    })
  }

  try {
    const verifierResult = await verifyEmailAddress(emailAddress)
    if (!verifierResult.status) {
      const errorMessage = `I tried to verify that email and got this error message: "${verifierResult.error.message}". If you think this is wrong, shoot an email to team@kentcdodds.com.`
      loginSession.flashError(errorMessage)
      return redirect(`/login`, {
        status: 400,
        headers: await loginSession.getHeaders(),
      })
    }
  } catch (error: unknown) {
    console.error(`There was an error verifying an email address:`, error)
    // continue on... This was probably our fault...
    // IDEA: notify me of this issue...
  }

  try {
    const domainUrl = getDomainUrl(request)
    await sendToken({emailAddress, domainUrl})
    return redirect(`/login`, {
      headers: await loginSession.getHeaders(),
    })
  } catch (e: unknown) {
    loginSession.flashError(getErrorMessage(e))
    return redirect(`/login`, {
      status: 400,
      headers: await loginSession.getHeaders(),
    })
  }
}

function Login() {
  const data = useLoaderData<LoaderData>()
  const [submitted, setSubmitted] = React.useState(false)

  const [formValues, setFormValues] = React.useState({
    email: data.email ?? '',
  })

  const formIsValid = formValues.email.match(/.+@.+/)

  return (
    <>
      <HeroSection
        imageBuilder={images.skis}
        imageSize="medium"
        title="Log in to your account."
        subtitle="Or sign up for an account."
        action={
          <main>
            <Form
              onChange={event => {
                const form = event.currentTarget
                setFormValues({email: form.email.value})
              }}
              onSubmit={() => setSubmitted(true)}
              action="/login"
              method="post"
              className="mb-10 lg:mb-12"
            >
              <div className="mb-6">
                <div className="flex flex-wrap items-baseline justify-between mb-4">
                  <Label htmlFor="email-address">Email address</Label>
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
                  defaultValue={formValues.email}
                  required
                  placeholder="Email address"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <Button type="submit" disabled={!formIsValid || submitted}>
                  Email a login link
                </Button>
                <LinkButton
                  type="reset"
                  onClick={() => {
                    setFormValues({email: ''})
                    setSubmitted(false)
                  }}
                >
                  Reset
                </LinkButton>
              </div>

              <div className="sr-only" aria-live="polite">
                {formIsValid
                  ? 'Sign in form is now valid and ready to submit'
                  : 'Sign in form is now invalid.'}
              </div>

              <div className="mt-2">
                {data.error ? (
                  <InputError id="error-message">{data.error}</InputError>
                ) : data.email ? (
                  <p
                    id="success-message"
                    className="dark:text-blueGray-500 text-gray-500 text-lg"
                  >
                    <span role="img" aria-label="sparkles">
                      ✨
                    </span>
                    {` A magic link has been sent to ${data.email}.`}
                  </p>
                ) : null}
              </div>
            </Form>
          </main>
        }
      />
      <Grid>
        <Paragraph className="col-span-full mb-10 md:col-span-4">
          {`
              To sign in to your account or to create a new one fill in your
              email above and we'll send you an email with a magic link to get
              you started.
            `}
        </Paragraph>

        <Paragraph
          className="col-span-full mb-10 text-sm md:col-span-4 lg:col-start-7"
          prose={false}
        >
          {`Tip: this account is a completely different account from your `}
          <a
            href="https://testingjavascript.com"
            className="underlined text-yellow-500"
            target="_blank"
            rel="noreferrer noopener"
          >
            TestingJavaScript.com
          </a>
          {` and `}
          <a
            href="https://epicreact.dev"
            className="underlined text-blue-500"
            target="_blank"
            rel="noreferrer noopener"
          >
            EpicReact.dev
          </a>
          {`
            accounts, but I recommend you use the same email address for all of
            them because they all feed into my mailing list.
          `}
        </Paragraph>
      </Grid>
    </>
  )
}

export default Login
