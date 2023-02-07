import * as React from 'react'
import type {
  ActionFunction,
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, useLoaderData} from '@remix-run/react'
import invariant from 'tiny-invariant'
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
import {prisma} from '~/utils/prisma.server'
import {getConvertKitSubscriber} from '~/convertkit/convertkit.server'

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
  const formData = await request.formData()
  const loginSession = await getLoginInfoSession(request)

  const emailAddress = formData.get('email')
  invariant(typeof emailAddress === 'string', 'Form submitted incorrectly')
  if (emailAddress) loginSession.setEmail(emailAddress)

  if (!emailAddress.match(/.+@.+/)) {
    loginSession.flashError('A valid email is required')
    return redirect(`/login`, {
      status: 400,
      headers: await loginSession.getHeaders(),
    })
  }

  // this is our honeypot. Our login is passwordless.
  const failedHoneypot = Boolean(formData.get('password'))
  if (failedHoneypot) {
    console.info(
      `FAILED HONEYPOT ON LOGIN`,
      Object.fromEntries(formData.entries()),
    )
    return redirect(`/login`, {
      headers: await loginSession.getHeaders(),
    })
  }

  try {
    const verifiedStatus = await isEmailVerified(emailAddress)
    if (!verifiedStatus.verified) {
      const errorMessage = `I tried to verify that email and got this error message: "${verifiedStatus.message}". If you think this is wrong, shoot an email to team@kentcdodds.com.`
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
    const magicLink = await sendToken({emailAddress, domainUrl})
    loginSession.setMagicLink(magicLink)
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

async function isEmailVerified(
  email: string,
): Promise<{verified: true} | {verified: false; message: string}> {
  const verifierResult = await verifyEmailAddress(email)
  if (verifierResult.status) return {verified: true}
  const userExists = Boolean(
    await prisma.user.findUnique({
      select: {id: true},
      where: {email},
    }),
  )
  if (userExists) return {verified: true}
  const convertKitSubscriber = await getConvertKitSubscriber(email)
  if (convertKitSubscriber) return {verified: true}

  return {verified: false, message: verifierResult.error.message}
}

function Login() {
  const data = useLoaderData<LoaderData>()
  const inputRef = React.useRef<HTMLInputElement>(null)
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
                <div className="mb-4 flex flex-wrap items-baseline justify-between">
                  <Label htmlFor="email-address">Email address</Label>
                </div>

                <Input
                  ref={inputRef}
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

              <div style={{position: 'absolute', left: '-9999px'}}>
                <label htmlFor="password-field">Password</label>
                {/* eslint-disable-next-line jsx-a11y/autocomplete-valid */}
                <input
                  type="password"
                  id="password-field"
                  name="password"
                  tabIndex={-1}
                  autoComplete="nope"
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
                    inputRef.current?.focus()
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
                    className="text-lg text-gray-500 dark:text-slate-500"
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
