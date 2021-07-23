import * as React from 'react'
import type {ActionFunction, LoaderFunction} from 'remix'
import {Form, json, redirect, useLoaderData, useActionData} from 'remix'
import clsx from 'clsx'
import {useEffect, useState} from 'react'
import {getQrCodeDataURL} from '../utils/qrcode.server'
import {
  getDiscordAuthorizeURL,
  getDomainUrl,
  getErrorMessage,
} from '../utils/misc'
import {useRequestInfo, useUser, useUserInfo} from '../utils/providers'
import {getMagicLink, updateUser} from '../utils/prisma.server'
import {requireUser, rootStorage, signOutSession} from '../utils/session.server'
import {H2, H6} from '../components/typography'
import {Grid} from '../components/grid'
import {Field, InputError, Label} from '../components/form-elements'
import {Button} from '../components/button'
import {CheckCircledIcon} from '../components/icons/check-circled-icon'
import {LogoutIcon} from '../components/icons/logout-icon'
import {TEAM_MAP} from '../utils/onboarding'
import {handleFormSubmission} from '../utils/actions.server'
import {EyeIcon} from '../components/icons/eye-icon'

type LoaderData = {qrLoginCode: string}
export const loader: LoaderFunction = ({request}) => {
  return requireUser(request, async user => {
    const qrLoginCode = await getQrCodeDataURL(
      getMagicLink({
        emailAddress: user.email,
        domainUrl: getDomainUrl(request),
      }),
    )
    const loaderData: LoaderData = {qrLoginCode}
    return json(loaderData)
  })
}

const actionIds = {
  changeDetails: 'change details',
  logout: 'logout',
}

function getFirstNameError(firstName: string | null) {
  if (!firstName?.length) return 'First name is required'
  return null
}

type ActionData = {
  fields: {
    firstName?: string | null
  }
  errors: {
    generalError?: string | null
    firstName?: string | null
  }
}
export const action: ActionFunction = async ({request}) => {
  return requireUser(request, async user => {
    const form = new URLSearchParams(await request.text())
    const actionId = form.get('actionId')

    try {
      if (actionId === actionIds.logout) {
        const session = await rootStorage.getSession(
          request.headers.get('Cookie'),
        )
        await signOutSession(session)

        return redirect('/', {
          headers: {'Set-Cookie': await rootStorage.commitSession(session)},
        })
      }
      if (actionId === actionIds.changeDetails) {
        return await handleFormSubmission<ActionData>(
          form,
          {firstName: getFirstNameError},
          async ({firstName}) => {
            if (firstName && user.firstName !== firstName) {
              await updateUser(user.id, {firstName})
            }
            return redirect('/me')
          },
        )
      }
      return redirect('/me')
    } catch (error: unknown) {
      return json({generalError: getErrorMessage(error)}, 500)
    }
  })
}

const SHOW_QR_DURATION = 15_000

function YouScreen() {
  const data = useLoaderData<LoaderData>()
  const actionData = useActionData() as ActionData | undefined
  const user = useUser()
  const userInfo = useUserInfo()
  const requestInfo = useRequestInfo()
  const authorizeURL = getDiscordAuthorizeURL(requestInfo.origin)
  const [qrIsVisible, setQrIsVisible] = useState(false)

  useEffect(() => {
    if (!qrIsVisible) return

    const timeout = setTimeout(() => {
      setQrIsVisible(false)
    }, SHOW_QR_DURATION)

    return () => clearTimeout(timeout)
  }, [qrIsVisible, setQrIsVisible])

  return (
    <div>
      <div className="mb-64 mt-24 pt-6">
        <Grid>
          <div className="col-span-full mb-12 lg:mb-20">
            <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
              <div>
                <H2>Here’s your profile.</H2>
                <H2 variant="secondary" as="p">
                  Edit as you wish.
                </H2>
              </div>
              <Form action="/me" method="post">
                <input type="hidden" name="actionId" value={actionIds.logout} />
                <Button type="submit" variant="secondary">
                  <LogoutIcon />
                  <H6 as="span">logout</H6>
                </Button>
              </Form>
            </div>
          </div>

          <Form
            action="/me"
            method="post"
            className="col-span-full mb-24 lg:col-span-5 lg:mb-0"
            noValidate
            aria-describedby="profile-form-error"
          >
            <input
              type="hidden"
              name="actionId"
              value={actionIds.changeDetails}
            />
            <InputError id="profile-form-error">
              {actionData?.errors.generalError}
            </InputError>

            <Field
              name="firstName"
              label="First name"
              defaultValue={actionData?.fields.firstName ?? user.firstName}
              autoComplete="firstName"
              required
              error={actionData?.errors.firstName}
            />

            <Field
              name="email"
              label="Email address"
              autoComplete="email"
              required
              defaultValue={user.email}
              readOnly
              disabled
            />

            <Field
              name="discord"
              label="Discord"
              defaultValue={userInfo.discord?.username ?? user.discordId ?? ''}
              placeholder="n/a"
              readOnly
              disabled
              description={
                user.discordId ? (
                  <a
                    className="underlined"
                    href={`https://discord.com/users/${user.discordId}`}
                  >
                    connected
                  </a>
                ) : (
                  <a className="underlined" href={authorizeURL}>
                    Connect to Discord
                  </a>
                )
              }
            />

            <Button className="mt-8" type="submit">
              Save changes
            </Button>
          </Form>

          <div className="col-span-full lg:col-span-4 lg:col-start-8">
            <Label className="mb-4" htmlFor="chosen-team">
              Chosen team
            </Label>

            <input
              className="sr-only"
              type="radio"
              name="team"
              value={user.team}
              checked
              readOnly
            />

            <div className="relative col-span-full mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg focus-within:outline-none ring-2 focus-within:ring-2 ring-team-current ring-offset-4 ring-offset-team-current ring-offset-team-current lg:col-span-4 lg:mb-0">
              <span className="absolute left-9 top-9 text-team-current">
                <CheckCircledIcon />
              </span>

              <div className="block pb-12 pt-20 px-12 text-center">
                <img
                  className="block mb-16"
                  src={TEAM_MAP[user.team].image()}
                  alt={TEAM_MAP[user.team].image.alt}
                />
                <H6 as="span">{TEAM_MAP[user.team].label}</H6>
              </div>
            </div>
          </div>
        </Grid>
      </div>

      <Grid>
        <div className="col-span-full mb-12 lg:col-span-5 lg:col-start-8 lg:mb-0">
          <H2>Need to login somewhere else?</H2>
          <H2 variant="secondary" as="p">
            Scan this QR code on the other device.
          </H2>
        </div>

        <div className="bg-secondary relative col-span-full p-4 rounded-lg lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <img
            src={data.qrLoginCode}
            alt="Login QR Code"
            className="w-full rounded-lg object-contain"
          />
          <button
            onClick={() => setQrIsVisible(true)}
            className={clsx(
              'focus-ring text-primary bg-secondary absolute inset-0 flex flex-col items-center justify-center w-full h-full text-lg font-medium rounded-lg transition duration-200',
              {
                'opacity-100': !qrIsVisible,
                'opacity-0': qrIsVisible,
              },
            )}
          >
            <EyeIcon size={36} />
            <span>click to reveal</span>
          </button>
        </div>
      </Grid>
    </div>
  )
}

export default YouScreen
