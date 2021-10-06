import * as React from 'react'
import {json, redirect, useLoaderData, useActionData, Form} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import clsx from 'clsx'
import {shuffle} from 'lodash'
import type {KCDHandle, Team} from '~/types'
import {useTeam} from '~/utils/team-provider'
import {getSession, getUser} from '~/utils/session.server'
import {getLoginInfoSession} from '~/utils/login.server'
import {prismaWrite, prismaRead, validateMagicLink} from '~/utils/prisma.server'
import {getErrorStack, teams} from '~/utils/misc'
import {tagKCDSiteSubscriber} from '../convertkit/convertkit.server'
import {Grid} from '~/components/grid'
import {H2, H6, Paragraph} from '~/components/typography'
import {Field, InputError} from '~/components/form-elements'
import {Button} from '~/components/button'
import {CheckCircledIcon} from '~/components/icons/check-circled-icon'
import {getImgProps, images} from '~/images'
import {TEAM_MAP} from '~/utils/onboarding'
import {HeaderSection} from '~/components/sections/header-section'
import {handleFormSubmission} from '~/utils/actions.server'
import {Spacer} from '~/components/spacer'

export const handle: KCDHandle = {
  getSitemapEntries: () => null,
}

type ActionData = {
  status: 'success' | 'error'
  fields: {
    firstName: string | null
    team: Team | null
  }
  errors: {
    generalError?: string
    firstName: string | null
    team: string | null
  }
}

type LoaderData = {
  email: string
  teamsInOrder: Array<Team>
}

function getErrorForFirstName(name: string | null) {
  if (!name) return `Name is required`
  if (name.length > 60) return `Name is too long`
  return null
}

function getErrorForTeam(team: string | null) {
  if (!team) return `Team is required`
  if (!teams.includes(team as Team)) return `Please choose a valid team`
  return null
}

const actionIds = {
  cancel: 'cancel',
  signUp: 'sign up',
}

export const action: ActionFunction = async ({request}) => {
  const loginInfoSession = await getLoginInfoSession(request)

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  if (form.get('actionId') === actionIds.cancel) {
    loginInfoSession.clean()
    return redirect('/', {
      headers: await loginInfoSession.getHeaders(),
    })
  }

  const session = await getSession(request)
  const magicLink = loginInfoSession.getMagicLink()
  let email: string
  try {
    if (typeof magicLink !== 'string') {
      throw new Error('email and magicLink required.')
    }

    email = await validateMagicLink(magicLink, loginInfoSession.getMagicLink())
  } catch (error: unknown) {
    console.error(getErrorStack(error))

    loginInfoSession.clean()
    loginInfoSession.flashError(
      'Sign in link invalid. Please request a new one.',
    )
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders(),
    })
  }

  return handleFormSubmission<ActionData>({
    form,
    validators: {
      firstName: getErrorForFirstName,
      team: getErrorForTeam,
    },
    handleFormValues: async formData => {
      const {firstName, team} = formData

      try {
        const user = await prismaWrite.user.create({
          data: {email, firstName, team},
        })

        // add user to mailing list
        const sub = await tagKCDSiteSubscriber(user)
        await prismaWrite.user.update({
          data: {convertKitId: String(sub.id)},
          where: {id: user.id},
        })

        const headers = new Headers()
        await session.singIn(user)
        await session.getHeaders(headers)
        // IDEA: try using destroy... Didn't seem to work last time I tried though.
        loginInfoSession.clean()
        await loginInfoSession.getHeaders(headers)
        return redirect('/me', {headers})
      } catch (error: unknown) {
        console.error(getErrorStack(error))

        loginInfoSession.flashError(
          'There was a problem creating your account. Please try again.',
        )
        return redirect('/login', {
          headers: await loginInfoSession.getHeaders(),
        })
      }
    },
  })
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  if (user) return redirect('/me')

  const loginInfoSession = await getLoginInfoSession(request)
  const magicLink = loginInfoSession.getMagicLink()
  const email = loginInfoSession.getEmail()
  if (!magicLink || !email) {
    loginInfoSession.clean()
    loginInfoSession.flashError('Invalid magic link. Try again.')
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders(),
    })
  }

  const userForMagicLink = await prismaRead.user.findFirst({
    where: {email},
    select: {id: true},
  })

  if (userForMagicLink) {
    // user exists, but they haven't clicked their magic link yet
    // we don't want to tell them that a user exists with that email though
    // so we'll invalidate the magic link and force them to try again.
    loginInfoSession.clean()
    loginInfoSession.flashError('Invalid magic link. Try again.')
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders(),
    })
  }

  const values: LoaderData = {
    email,
    // have to put this shuffle in the loader to ensure server render is the same as the client one.
    teamsInOrder: shuffle(teams),
  }
  return json(values, {
    headers: await loginInfoSession.getHeaders(),
  })
}

interface TeamOptionProps {
  team: Team
  error?: string | null
  selected: boolean
}

function TeamOption({team: value, error, selected}: TeamOptionProps) {
  const team = TEAM_MAP[value]

  return (
    <div
      className={clsx(
        'focus-ring relative col-span-full mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg lg:col-span-4 lg:mb-0',
        team.focusClassName,
        {
          'ring-2': selected,
        },
      )}
    >
      {selected ? (
        <span className="absolute left-9 top-9 text-team-current">
          <CheckCircledIcon />
        </span>
      ) : null}

      <label className="block pb-12 pt-20 px-12 text-center cursor-pointer">
        <input
          className="sr-only"
          type="radio"
          name="team"
          value={value}
          aria-describedby={error ? 'team-error' : undefined}
        />
        <img
          className="block mb-16 mx-auto"
          {...getImgProps(team.image, {
            widths: [350, 512, 685, 1370, 2055],
            sizes: [
              '(max-width: 1023px) 65vw',
              '(min-width:1023px) and (max-width:1620px) 20vw',
              '320px',
            ],
          })}
        />
        <H6 as="span">{team.label}</H6>
      </label>
    </div>
  )
}

export default function NewAccount() {
  const data = useLoaderData<LoaderData>()
  const actionData = useActionData<ActionData>()
  const [, setTeam] = useTeam()
  const [formValues, setFormValues] = React.useState<{
    firstName: string
    team?: Team
  }>({
    firstName: '',
    team: undefined,
  })

  const formIsValid =
    formValues.firstName.trim().length > 0 &&
    teams.includes(formValues.team as Team)

  const team = formValues.team
  React.useEffect(() => {
    if (team && teams.includes(team)) setTeam(team)
  }, [team, setTeam])

  return (
    <main className="mt-24 pt-6">
      <HeaderSection
        title="Let's start with choosing a team."
        subTitle="You can't change this later."
        className="mb-16"
      />

      <Form
        method="post"
        onChange={event => {
          const form = event.currentTarget
          setFormValues({
            firstName: form.firstName.value,
            team: form.team.value,
          })
        }}
      >
        <input type="hidden" name="actionId" value={actionIds.signUp} />
        <Grid>
          {actionData?.errors.team ? (
            <div className="col-span-full mb-4 text-right">
              <InputError id="team-error">{actionData.errors.team}</InputError>
            </div>
          ) : null}

          <fieldset className="contents">
            <legend className="sr-only">Team</legend>
            {data.teamsInOrder.map(teamOption => (
              <TeamOption
                key={teamOption}
                team={teamOption}
                error={actionData?.errors.team}
                selected={formValues.team === teamOption}
              />
            ))}
          </fieldset>

          <div className="col-span-full h-20 lg:h-24" />

          <div className="col-span-full mb-12">
            <H2>{`Some basic info to remember you.`}</H2>
            <H2 variant="secondary" as="p">
              {`You can change this later.`}
            </H2>
          </div>

          <div className="col-span-full mb-12 lg:col-span-5 lg:mb-20">
            <Field
              name="firstName"
              label="First name"
              error={actionData?.errors.firstName}
              autoComplete="firstName"
              defaultValue={actionData?.fields.firstName ?? ''}
              required
            />
          </div>

          <div className="col-span-full mb-12 lg:col-span-5 lg:col-start-7 lg:mb-20">
            <Field
              name="email"
              label="Email"
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
              defaultValue={data.email}
              readOnly
              disabled
            />
          </div>

          <div className="col-span-full">
            <Button type="submit" disabled={!formIsValid}>
              {`Create account`}
            </Button>
          </div>
          <p className="col-span-4 mt-10 text-xs font-medium tracking-wider">
            {`
              NOTICE: By signing up for an account, your email address will be
              added to Kent's mailing list (if it's not already) and
              you'll ocassionally receive promotional emails from Kent. You
              can unsubscribe at any time.
            `}
          </p>
        </Grid>
      </Form>
      <Spacer size="2xs" />
      <Grid>
        <Form method="post">
          <input type="hidden" name="actionId" value={actionIds.cancel} />
          <Button type="submit" variant="danger">
            {`Cancel`}
          </Button>
        </Form>
      </Grid>
      <Spacer size="lg" />
      <Grid>
        <div className="col-span-full lg:col-span-5 lg:col-start-8">
          <H2 className="mb-32">{`You might be thinking, why pick a team?`}</H2>

          <H6 as="h3" className="mb-4">
            {`Own a post`}
          </H6>
          <Paragraph className="mb-12">
            {`
              Your team associates your blog post reads with a group and it's
              fun to know that your contributing to a group while learning
              and reading. When your team has the highest ranking on a post,
              you "own" that post. Kinda like an NFT, but not really.
            `}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            {`Exclusive team discord channels`}
          </H6>
          <Paragraph className="mb-12">
            {`
              After signing up you can connect your discord account. When you do
              this, your account will be given a team role. This will give you
              access to your team channels where you can plan team blog post
              raids and fun stuff like that.
            `}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            {`UI Theme`}
          </H6>
          <Paragraph className="mb-12">
            {`
              The theme of this website is controlled by your team color
              selection. So choose your favorite color and have that preference
              shown throughout the site.
            `}
          </Paragraph>
        </div>

        <div className="col-span-full lg:col-span-6 lg:col-start-1 lg:row-start-1">
          <div className="aspect-h-6 aspect-w-4">
            <img
              className="rounded-lg object-cover"
              {...getImgProps(images.kentPalmingSoccerBall, {
                widths: [512, 650, 840, 1024, 1300, 1680, 2000, 2520],
                sizes: [
                  '(max-width: 1023px) 80vw',
                  '(min-width: 1024px) and (max-width: 1620px) 40vw',
                  '650px',
                ],
                transformations: {
                  resize: {
                    type: 'fill',
                    aspectRatio: '3:4',
                  },
                },
              })}
            />
          </div>
        </div>
      </Grid>
    </main>
  )
}
