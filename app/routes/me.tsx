import * as React from 'react'
import type {
  ActionFunction,
  DataFunctionArgs,
  HeadersFunction,
  MetaFunction,
} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Form, useActionData, useLoaderData} from '@remix-run/react'
import clsx from 'clsx'
import {Dialog} from '@reach/dialog'
import type {KCDHandle} from '~/types'
import {useRootData} from '~/utils/use-root-data'
import {getQrCodeDataURL} from '~/utils/qrcode.server'
import {
  getDiscordAuthorizeURL,
  getDisplayUrl,
  getDomainUrl,
  getErrorMessage,
  getTeam,
  getUrl,
  reuseUsefulLoaderHeaders,
} from '~/utils/misc'
import {
  deleteConvertKitCache,
  deleteDiscordCache,
  gravatarExistsForEmail,
} from '~/utils/user-info.server'
import {prisma, getMagicLink} from '~/utils/prisma.server'
import {
  deleteOtherSessions,
  getSession,
  requireUser,
} from '~/utils/session.server'
import {H2, H3, H6, Paragraph} from '~/components/typography'
import {Grid} from '~/components/grid'
import {Field, InputError, Label} from '~/components/form-elements'
import {Button, ButtonLink} from '~/components/button'
import {
  CheckCircledIcon,
  LogoutIcon,
  EyeIcon,
  PlusIcon,
  RefreshIcon,
} from '~/components/icons'
import {
  TEAM_ONEWHEELING_MAP,
  TEAM_SKIING_MAP,
  TEAM_SNOWBOARD_MAP,
} from '~/utils/onboarding'
import {handleFormSubmission} from '~/utils/actions.server'
import {Spacer} from '~/components/spacer'
import {getSocialMetas} from '~/utils/seo'
import type {LoaderData as RootLoaderData} from '../root'
import {getGenericSocialImage, images} from '~/images'
import {getServerTimeHeader} from '~/utils/timing.server'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

export const meta: MetaFunction = ({parentsData}) => {
  const {requestInfo} = parentsData.root as RootLoaderData
  const domain = new URL(requestInfo.origin).host
  return {
    ...getSocialMetas({
      title: `Your account on ${domain}`,
      description: `Personal account information on ${domain}.`,
      url: getUrl(requestInfo),
      image: getGenericSocialImage({
        url: getDisplayUrl(requestInfo),
        featuredImage: images.kodySnowboardingGray(),
        words: `View your account info on ${domain}`,
      }),
    }),
  }
}

export async function loader({request}: DataFunctionArgs) {
  const timings = {}
  const user = await requireUser(request, {timings})

  const sessionCount = await prisma.session.count({
    where: {userId: user.id},
  })
  const qrLoginCode = await getQrCodeDataURL(
    getMagicLink({
      emailAddress: user.email,
      validateSessionMagicLink: false,
      domainUrl: getDomainUrl(request),
    }),
  )
  const activities = ['skiing', 'snowboarding', 'onewheeling'] as const
  const activity: 'skiing' | 'snowboarding' | 'onewheeling' =
    activities[Math.floor(Math.random() * activities.length)] ?? 'skiing'
  return json(
    {
      qrLoginCode,
      sessionCount,
      teamType: activity,
    } as const,
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        Vary: 'Cookie',
        'Server-Timing': getServerTimeHeader(timings),
      },
    },
  )
}

export const headers: HeadersFunction = reuseUsefulLoaderHeaders

const actionIds = {
  logout: 'logout',
  changeDetails: 'change details',
  deleteDiscordConnection: 'delete discord connection',
  deleteAccount: 'delete account',
  deleteSessions: 'delete sessions',
  refreshGravatar: 'refresh gravatar',
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
      await session.signOut()
      const searchParams = new URLSearchParams({
        message: `👋 See you again soon!`,
      })
      return redirect(`/?${searchParams.toString()}`, {
        headers: await session.getHeaders(),
      })
    }
    if (actionId === actionIds.deleteDiscordConnection && user.discordId) {
      await deleteDiscordCache(user.discordId)
      await prisma.user.update({
        where: {id: user.id},
        data: {discordId: null},
      })
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
            await prisma.user.update({
              where: {id: user.id},
              data: {firstName},
            })
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
      await session.signOut()
      if (user.discordId) await deleteDiscordCache(user.discordId)
      if (user.convertKitId) await deleteConvertKitCache(user.convertKitId)

      await prisma.user.delete({where: {id: user.id}})
      const searchParams = new URLSearchParams({
        message: `✅ Your KCD account and all associated data has been completely deleted from the KCD database.`,
      })
      return redirect(`/?${searchParams.toString()}`, {
        headers: await session.getHeaders(),
      })
    }
    if (actionId === actionIds.refreshGravatar) {
      await gravatarExistsForEmail({email: user.email, forceFresh: true})
    }
    return redirect('/me')
  } catch (error: unknown) {
    return json({generalError: getErrorMessage(error)}, 500)
  }
}

const SHOW_QR_DURATION = 15_000

function YouScreen() {
  const data = useLoaderData<typeof loader>()
  const teamMap = {
    skiing: TEAM_SKIING_MAP,
    snowboarding: TEAM_SNOWBOARD_MAP,
    onewheeling: TEAM_ONEWHEELING_MAP,
  }[data.teamType]
  const otherSessionsCount = data.sessionCount - 1
  const actionData = useActionData<ActionData>()
  const {requestInfo, userInfo, user} = useRootData()
  const team = getTeam(user?.team)

  // this *should* never happen...
  if (!user) throw new Error('user required')
  if (!userInfo) throw new Error('userInfo required')
  if (!team) throw new Error('team required')

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
              action="/me"
              method="post"
              noValidate
              aria-describedby="general-error"
            >
              <Field
                name="firstName"
                label="First name"
                defaultValue={actionData?.fields.firstName ?? user.firstName}
                autoComplete="given-name"
                required
                error={actionData?.errors.firstName}
              />
              <Field
                name="email"
                label="Email address"
                autoComplete="email"
                required
                defaultValue={user.email}
                description={
                  <div className="flex gap-1">
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
                    <button
                      type="submit"
                      name="actionId"
                      value={actionIds.refreshGravatar}
                    >
                      <RefreshIcon />
                    </button>
                  </div>
                }
                readOnly
                disabled
              />

              <Field
                name="discord"
                label="Discord"
                defaultValue={
                  userInfo.discord?.username ?? user.discordId ?? ''
                }
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
                      <button
                        name="actionId"
                        value={actionIds.deleteDiscordConnection}
                        type="submit"
                        aria-label="remove connection"
                        className="text-secondary rotate-45 outline-none hover:scale-150 focus:scale-150"
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  ) : (
                    <a className="underlined" href={authorizeURL}>
                      Connect to Discord
                    </a>
                  )
                }
              />

              <Button
                className="mt-8"
                type="submit"
                name="actionId"
                value={actionIds.changeDetails}
              >
                Save changes
              </Button>
            </Form>
          </div>

          <div className="col-span-full lg:col-span-4 lg:col-start-8">
            <div className="flex justify-between gap-2 align-bottom">
              <Label className="mb-4" htmlFor="chosen-team">
                Chosen team
              </Label>
              <a
                className="underlined mb-5 animate-pulse text-lg hover:animate-none focus:animate-none"
                href="https://kcd.im/shirts"
              >
                Get your team shirt{' '}
                <span className="inline-block" role="img" aria-label="t-shirt">
                  👕
                </span>
              </a>
            </div>

            <input
              className="sr-only"
              type="radio"
              name="team"
              value={team}
              checked
              readOnly
            />

            <div className="relative col-span-full mb-3 rounded-lg bg-gray-100 ring-2 ring-team-current ring-offset-4 ring-offset-team-current focus-within:outline-none focus-within:ring-2 dark:bg-gray-800 lg:col-span-4 lg:mb-0">
              <span className="absolute left-9 top-9 text-team-current">
                <CheckCircledIcon />
              </span>

              <div className="block px-12 pb-12 pt-20 text-center">
                <img
                  className="mb-16 block"
                  src={teamMap[team].image()}
                  alt={teamMap[team].image.alt}
                />
                <H6 as="span">{teamMap[team].label}</H6>
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

        <div className="bg-secondary relative col-span-full rounded-lg p-4 lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <img
            src={data.qrLoginCode}
            alt="Login QR Code"
            className="w-full rounded-lg object-contain"
          />
          <button
            onClick={() => setQrIsVisible(true)}
            className={clsx(
              'focus-ring text-primary bg-secondary absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-lg text-lg font-medium transition duration-200',
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
        <div className="col-span-full flex flex-wrap gap-3">
          <ButtonLink
            variant="secondary"
            download="my-kcd-data.json"
            href={`${requestInfo.origin}/me/download.json`}
          >
            Download Your Data
          </ButtonLink>
          <Form
            action="/me"
            method="post"
            noValidate
            aria-describedby="general-error"
          >
            <Button
              disabled={otherSessionsCount < 1}
              variant="danger"
              type="submit"
              name="actionId"
              value={actionIds.deleteSessions}
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
        className="w-11/12 rounded-lg border-2 border-black dark:border-white dark:bg-gray-900 lg:max-w-screen-lg lg:px-24 lg:py-14"
      >
        <H3>Delete your KCD Account</H3>
        <Paragraph>
          {`Are you certain you want to do this? There's no going back.`}
        </Paragraph>
        <Spacer size="2xs" />
        <Form
          action="/me"
          method="post"
          noValidate
          aria-describedby="general-error"
        >
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={() => setDeleteModalOpen(false)}>
              Nevermind
            </Button>
            <Button
              variant="danger"
              name="actionId"
              value={actionIds.deleteAccount}
              size="medium"
              type="submit"
            >
              Delete Account
            </Button>
          </div>
        </Form>
      </Dialog>
    </main>
  )
}

export default YouScreen
