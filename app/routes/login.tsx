import {
  json,
  redirect,
  type ActionFunction,
  type HeadersFunction,
  type LoaderFunction,
  type V2_MetaFunction,
} from '@remix-run/node'
import {Form, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import invariant from 'tiny-invariant'
import {Button, LinkButton} from '~/components/button.tsx'
import {Input, InputError, Label} from '~/components/form-elements.tsx'
import {Grid} from '~/components/grid.tsx'
import {HeroSection} from '~/components/sections/hero-section.tsx'
import {Paragraph} from '~/components/typography.tsx'
import {getConvertKitSubscriber} from '~/convertkit/convertkit.server.ts'
import {getGenericSocialImage, images} from '~/images.tsx'
import {getLoginInfoSession} from '~/utils/login.server.ts'
import {
  getDisplayUrl,
  getDomainUrl,
  getErrorMessage,
  getOrigin,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc.tsx'
import {prisma} from '~/utils/prisma.server.ts'
import {getSocialMetas} from '~/utils/seo.ts'
import {getUser, sendToken} from '~/utils/session.server.ts'
import {verifyEmailAddress} from '~/utils/verifier.server.ts'
import {type RootLoaderType} from '~/root.tsx'

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

export const meta: V2_MetaFunction<typeof loader, {root: RootLoaderType}> = ({
  matches,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const requestInfo = matches.find(m => m.id === 'root')?.data.requestInfo
  const domain = new URL(getOrigin(requestInfo)).host
  return getSocialMetas({
    title: `Se connecter sur ${domain}`,
    description: `Se connecter ou s'enregister sur '${domain} pour rejoindre l'équipe et apprendre ensemble`,
    url: getUrl(requestInfo),
    image: getGenericSocialImage({
      url: getDisplayUrl(requestInfo),
      featuredImage: images.skis.id,
      words: `Se connecter sur ${domain}`,
    }),
  })
}

export const action: ActionFunction = async ({request}) => {
  const formData = await request.formData()
  const loginSession = await getLoginInfoSession(request)

  const emailAddress = formData.get('email')
  invariant(typeof emailAddress === 'string', 'Oups, mauvais remplissage !')
  if (emailAddress) loginSession.setEmail(emailAddress)

  if (!emailAddress.match(/.+@.+/)) {
    loginSession.flashError('Entrez une adresse mail valide !')
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
      const errorMessage = `I tried to verify that email and got this error message: "${verifiedStatus.message}". If you think this is wrong, sign up for Faust's mailing list first (using the form on the bottom of the page) and once that's confirmed you'll be able to sign up.`
      loginSession.flashError(errorMessage)
      return redirect(`/login`, {
        status: 400,
        headers: await loginSession.getHeaders(),
      })
    }
  } catch (error: unknown) {
    console.error(`Nous avons une erreur de vérification de votre mail:`, error)
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
        title="Se connecter"
        subtitle="Ou créer un compte."
        action={
          <main>
            <Form
              onChange={event => {
                const form = event.currentTarget
                setFormValues({email: form.email.value})
              }}
              onSubmit={() => setSubmitted(true)}
              action="/login"
              method="POST"
              className="mb-10 lg:mb-12"
            >
              <div className="mb-6">
                <div className="mb-4 flex flex-wrap items-baseline justify-between">
                  <Label htmlFor="email-address">Adresse mail</Label>
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
                  Lien de connexion
                </Button>
                <LinkButton
                  type="reset"
                  onClick={() => {
                    setFormValues({email: ''})
                    setSubmitted(false)
                    inputRef.current?.focus()
                  }}
                >
                  Modifier 
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
                    {`✨ A magic link has been sent to ${data.email}.`}
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

           Pour vous connecter à votre compte ou en créer un nouveau, indiquez votre adresse e-mail ci-dessus et nous vous enverrons un e-mail avec un lien magique pour commencer.
            `}
        </Paragraph>

        <Paragraph
          className="col-span-full mb-10 text-sm md:col-span-4 lg:col-start-7"
          prose={false}
        >
          {`Ce compte est complètement unique et indépendant de tout les autres ! `}
        </Paragraph>
      </Grid>
    </>
  )
}

export default Login
