import * as React from 'react'
import type {
  ActionFunction,
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from 'remix'
import {Form, json, redirect, useLoaderData, useActionData} from 'remix'
import clsx from 'clsx'
import Dialog from '@reach/dialog'
import type {KCDHandle} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {getQrCodeDataURL} from '~/utils/qrcode.server'
import {
  getDiscordAuthorizeURL,
  getDisplayUrl,
  getDomainUrl,
  getErrorMessage,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {
  deleteConvertKitCache,
  deleteDiscordCache,
} from '~/utils/user-info.server'
import {
  prismaRead,
  deleteUser,
  getMagicLink,
  updateUser,
} from '~/utils/prisma.server'
import {
  deleteOtherSessions,
  getSession,
  requireUser,
} from '~/utils/session.server'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {Grid} from '~/components/grid'
import {Field, InputError, Label} from '~/components/form-elements'
import {Button, ButtonLink} from '~/components/button'
import {CheckCircledIcon} from '~/components/icons/check-circled-icon'
import {LogoutIcon} from '~/components/icons/logout-icon'
import {TEAM_MAP} from '~/utils/onboarding'
import {handleFormSubmission} from '~/utils/actions.server'
import {EyeIcon} from '~/components/icons/eye-icon'
import {PlusIcon} from '~/components/icons/plus-icon'
import {Spacer} from '~/components/spacer'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as RootLoaderData} from '../root'
import {getGenericSocialImage, images} from '~/images'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  const domain = new URL(requestInfo.origin).host
  return {
    ...getSocialMetas({
      origin: requestInfo.origin,
      title: `Your account on ${domain}`,
      description: `Personal account information on ${domain}.`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        origin: requestInfo.origin,
        url: getDisplayUrl(requestInfo),
        featuredImage: images.kodySnowboardingWhite(),
        words: `View your account info on ${domain}`,
      }),
    }),
  }
}

type LoaderData = {qrLoginCode: string; sessionCount: number}
export const loader: LoaderFunction = async ({request}) => {
  const user = await requireUser(request)

  const sessionCount = await prismaRead.session.count({
    where: {userId: user.id},
  })
  const qrLoginCode = await getQrCodeDataURL(
    getMagicLink({
      emailAddress: user.email,
      validateSessionMagicLink: false,
      domainUrl: getDomainUrl(request),
    }),
  )
  const loaderData: LoaderData = {qrLoginCode, sessionCount}
  return json(loaderData, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      Vary: 'Cookie',
    },
  })
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

const actionIds = {
  logout: 'logout',
  changeDetails: 'change details',
  deleteDiscordConnection: 'delete discord connection',
  deleteAccount: 'delete account',
  deleteSessions: 'delete sessions',
}

function getFirstNameError(firstName: string | null) {
  if (!firstName?.length) return 'First name is required'
  return null
}

type ActionData = {
  status: 'success' | 'error'
  fields: {
    firstName?: string | null
  }
  errors: {
    generalError?: string | null
    firstName?: string | null
  }
}
export const action: ActionFunction = async ({request}) => {
  const user = await requireUser(request)
  const form = new URLSearchParams(await request.text())
  const actionId = form.get('actionId')

  try {
    if (actionId === actionIds.logout) {
      const session = await getSession(request)
      session.signOut()
      const searchParams = new URLSearchParams({
        message: `👋 See you again soon!`,
      })
      return redirect(`/?${searchParams.toString()}`, {
        headers: await session.getHeaders(),
      })
    }
    if (actionId === actionIds.deleteDiscordConnection && user.discordId) {
      await deleteDiscordCache(user.discordId)
      await updateUser(user.id, {discordId: null})
      const searchParams = new URLSearchParams({
        message: `✅ Connection deleted`,
      })
      return redirect(`/me?${searchParams.toString()}`)
    }
    if (actionId === actionIds.changeDetails) {
      return await handleFormSubmission<ActionData>({
        form,
        validators: {firstName: getFirstNameError},
        handleFormValues: async ({firstName}) => {
          if (firstName && user.firstName !== firstName) {
            await updateUser(user.id, {firstName})
          }
          const searchParams = new URLSearchParams({
            message: `✅ Sucessfully saved your info`,
          })
          return redirect(`/me?${searchParams.toString()}`)
        },
      })
    }
    if (actionId === actionIds.deleteSessions) {
      await deleteOtherSessions(request)
      const searchParams = new URLSearchParams({
        message: `✅ Sucessfully signed out of other sessions`,
      })
      return redirect(`/me?${searchParams.toString()}`)
    }
    if (actionId === actionIds.deleteAccount) {
      const session = await getSession(request)
      session.signOut()
      if (user.discordId) await deleteDiscordCache(user.discordId)
      if (user.convertKitId) await deleteConvertKitCache(user.convertKitId)

      await deleteUser(user.id)
      const searchParams = new URLSearchParams({
        message: `✅ Your KCD account and all associated data has been completely deleted from the KCD database.`,
      })
      return redirect(`/?${searchParams.toString()}`, {
        headers: await session.getHeaders(),
      })
    }
    return redirect('/me')
  } catch (error: unknown) {
    return json({generalError: getErrorMessage(error)}, 500)
  }
}

const SHOW_QR_DURATION = 15_000

function YouScreen() {
  const data = useLoaderData<LoaderData>()
  const otherSessionsCount = data.sessionCount - 1
  const actionData = useActionData<ActionData>()
  const {requestInfo, userInfo, user} = useRootData()

  // this *should* never happen...
  if (!user) throw new Error('user required')
  if (!userInfo) throw new Error('userInfo required')

  const authorizeURL = getDiscordAuthorizeURL(requestInfo.origin)
  const [qrIsVisible, setQrIsVisible] = React.useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (!qrIsVisible) return

    const timeout = setTimeout(() => {
      setQrIsVisible(false)
    }, SHOW_QR_DURATION)

    return () => clearTimeout(timeout)
  }, [qrIsVisible, setQrIsVisible])

  return (
    <main>
      <div className="mb-64 mt-24 pt-6">
        <Grid>
          <div className="col-span-full mb-12 lg:mb-20">
            <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
              <div>
                <H2>{`Here's your profile.`}</H2>
                <H2 variant="secondary" as="p">
                  {`Edit as you wish.`}
                </H2>
              </div>
              <Form action="/me" method="post">
                <input type="hidden" name="actionId" value={actionIds.logout} />
                <Button variant="secondary">
                  <LogoutIcon />
                  <H6 as="span">logout</H6>
                </Button>
              </Form>
            </div>
          </div>
          <InputError id="general-erorr">
            {actionData?.errors.generalError}
          </InputError>

          <div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
            <Form
              id="profile-form"
              action="/me"
              method="post"
              noValidate
              aria-describedby="general-error"
            >
              <input
                type="hidden"
                name="actionId"
                value={actionIds.changeDetails}
              />
              <Field
                name="firstName"
                label="First name"
                defaultValue={actionData?.fields.firstName ?? user.firstName}
                autoComplete="firstName"
                required
                error={actionData?.errors.firstName}
              />
            </Form>
            <Field
              name="email"
              label="Email address"
              autoComplete="email"
              required
              defaultValue={user.email}
              description={
                <span>
                  {`This controls your avatar via `}
                  <a
                    className="underlined font-bold"
                    href="https://gravatar.com"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Gravatar
                  </a>
                  {'.'}
                </span>
              }
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
                  <div className="flex gap-2">
                    <a
                      className="underlined"
                      href={`https://discord.com/users/${user.discordId}`}
                    >
                      connected
                    </a>
                    <Form action="/me" method="post">
                      <input
                        type="hidden"
                        name="actionId"
                        value={actionIds.deleteDiscordConnection}
                      />
                      <button
                        type="submit"
                        aria-label="remove connection"
                        className="text-secondary outline-none rotate-45 hover:scale-150 focus:scale-150"
                      >
                        <PlusIcon />
                      </button>
                    </Form>
                  </div>
                ) : (
                  <a className="underlined" href={authorizeURL}>
                    Connect to Discord
                  </a>
                )
              }
            />

            <Button className="mt-8" type="submit" form="profile-form">
              Save changes
            </Button>
          </div>

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

      <Spacer size="sm" />

      <Grid>
        <div className="col-span-full">
          <H2>Manage Your Account</H2>
        </div>
        <Spacer size="3xs" className="col-span-full" />
        <div className="flex flex-wrap gap-3 col-span-full">
          <ButtonLink
            variant="secondary"
            download="my-kcd-data.json"
            href={`${requestInfo.origin}/me/download.json`}
          >
            Download Your Data
          </ButtonLink>
          <Form
            id="profile-form"
            action="/me"
            method="post"
            noValidate
            aria-describedby="general-error"
          >
            <input
              type="hidden"
              name="actionId"
              value={actionIds.deleteSessions}
            />
            <Button
              disabled={otherSessionsCount < 1}
              variant="danger"
              type="submit"
            >
              Sign out of {otherSessionsCount}{' '}
              {otherSessionsCount === 1 ? 'session' : 'sessions'}
            </Button>
          </Form>
          <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
            Delete Account
          </Button>
        </div>
      </Grid>

      <Dialog
        onDismiss={() => setDeleteModalOpen(false)}
        isOpen={deleteModalOpen}
        aria-label="Delete your account"
        className="w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg"
      >
        <H3>Delete your KCD Account</H3>
        <Paragraph>
          {`Are you certain you want to do this? There's no going back.`}
        </Paragraph>
        <Spacer size="2xs" />
        <Form
          id="profile-form"
          action="/me"
          method="post"
          noValidate
          aria-describedby="general-error"
        >
          <input
            type="hidden"
            name="actionId"
            value={actionIds.deleteAccount}
          />
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={() => setDeleteModalOpen(false)}>
              Nevermind
            </Button>
            <Button variant="danger" size="medium" type="submit">
              Delete Account
            </Button>
          </div>
        </Form>
      </Dialog>
    </main>
  )
}

export default YouScreen
