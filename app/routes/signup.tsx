import * as React from 'react'
import {Form, json, redirect, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import type {Team} from 'types'
import clsx from 'clsx'
import {shuffle} from 'lodash'
import {
  getUser,
  rootStorage,
  sessionKeys,
  signInSession,
} from '../utils/session.server'
import {createSession, prisma, validateMagicLink} from '../utils/prisma.server'
import {getErrorMessage, getNonNull, teams} from '../utils/misc'
import {tagKCDSiteSubscriber} from '../utils/convertkit.server'
import {useTeam} from '../utils/providers'
import {Grid} from '../components/grid'
import {H2, H6, Paragraph} from '../components/typography'
import {Field, InputError} from '../components/form-elements'
import {Button} from '../components/button'
import {CheckCircledIcon} from '../components/icons/check-circled-icon'
import {images} from '../images'
import {TEAM_MAP} from '../utils/onboarding'
import {HeaderSection} from '../components/sections/header-section'

type LoaderData = {
  email: string
  teamsInOrder: Array<Team>
  errors?: {
    generalError?: string
    firstName: string | null
    team: string | null
  }
  fields?: {
    firstName: string | null
    team: Team | null
  }
}

const errorSessionKey = 'new_account_error'
const fieldsSessionKey = 'new_account_fields'

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

export const action: ActionFunction = async ({request}) => {
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const magicLink = session.get(sessionKeys.magicLink)
  let email
  try {
    if (typeof magicLink !== 'string') {
      throw new Error('email and magicLink required.')
    }

    email = await validateMagicLink(magicLink)
  } catch (error: unknown) {
    console.error(getErrorMessage(error))

    session.flash('error', 'Sign in link invalid. Please request a new one.')
    return redirect('/login', {
      headers: {'Set-Cookie': await rootStorage.commitSession(session)},
    })
  }

  const requestText = await request.text()
  const form = new URLSearchParams(requestText)
  const formData: LoaderData['fields'] = {
    firstName: form.get('firstName'),
    team: form.get('team') as Team | null,
  }
  session.flash(fieldsSessionKey, formData)

  const errors: LoaderData['errors'] = {
    firstName: getErrorForFirstName(formData.firstName),
    team: getErrorForTeam(formData.team),
  }

  if (errors.firstName || errors.team) {
    session.flash(errorSessionKey, errors)
    return redirect(new URL(request.url).pathname, {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  }

  const {firstName, team} = getNonNull(formData)

  try {
    const user = await prisma.user.create({data: {email, firstName, team}})

    // add user to mailing list
    const sub = await tagKCDSiteSubscriber(user)
    await prisma.user.update({
      data: {convertKitId: String(sub.id)},
      where: {id: user.id},
    })

    const userSession = await createSession({userId: user.id})
    session.unset('email')
    session.unset('magicLink')
    await signInSession(session, userSession.id)

    const cookie = await rootStorage.commitSession(session, {maxAge: 604_800})
    return redirect('/me', {
      headers: {'Set-Cookie': cookie},
    })
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error(message)

    session.flash(
      'error',
      'There was a problem creating your account. Please try again.',
    )
    return redirect('/login', {
      headers: {'Set-Cookie': await rootStorage.commitSession(session)},
    })
  }
}

export const loader: LoaderFunction = async ({request}) => {
  const user = await getUser(request)
  if (user) return redirect('/me')

  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const email = session.get(sessionKeys.email)
  if (!email) {
    session.unset(sessionKeys.email)
    session.unset(sessionKeys.magicLink)
    session.flash('error', 'Invalid magic link. Try again.')
    return redirect('/login', {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  }
  const values: LoaderData = {
    email: session.get(sessionKeys.email),
    // have to put this in the loader to ensure server render is the same as the client one.
    teamsInOrder: shuffle(teams),
    errors: session.get(errorSessionKey),
    fields: session.get(fieldsSessionKey),
  }
  return json(values, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
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
        <img className="block mb-16" src={team.image()} alt={team.image.alt} />
        <H6 as="span">{team.label}</H6>
      </label>
    </div>
  )
}

export default function NewAccount() {
  const data = useRouteData<LoaderData>()
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
    <div className="mt-24 pt-6">
      <Form
        className="mb-64"
        method="post"
        onChange={event => {
          const form = event.currentTarget
          setFormValues({
            firstName: form.firstName.value,
            team: form.team.value,
          })
        }}
      >
        <HeaderSection
          title="Let’s start with choosing a team."
          subTitle="You can’t change this later."
          className="mb-16"
        />

        <Grid>
          {data.errors?.team ? (
            <div className="col-span-full mb-4 text-right">
              <InputError id="team-error">{data.errors.team}</InputError>
            </div>
          ) : null}

          <fieldset className="contents">
            <legend className="sr-only">Team</legend>
            {data.teamsInOrder.map(teamOption => (
              <TeamOption
                key={teamOption}
                team={teamOption}
                error={data.errors?.team}
                selected={formValues.team === teamOption}
              />
            ))}
          </fieldset>

          <div className="col-span-full h-20 lg:h-24" />

          <div className="col-span-full mb-12">
            <H2>Some basic info to remember you.</H2>
            <H2 variant="secondary" as="p">
              You can change these later.
            </H2>
          </div>

          <div className="col-span-full mb-12 lg:col-span-5 lg:mb-20">
            <Field
              name="firstName"
              label="First name"
              error={data.errors?.firstName}
              autoComplete="firstName"
              defaultValue={data.fields?.firstName ?? ''}
              required
            />
          </div>

          <div className="col-span-full mb-12 lg:col-span-5 lg:col-start-7 lg:mb-20">
            <Field
              name="email"
              label="Email"
              defaultValue={data.email}
              readOnly
              disabled
            />
          </div>

          <div className="col-span-full">
            <Button type="submit" disabled={!formIsValid}>
              Create account
            </Button>
          </div>
        </Grid>
      </Form>

      <Grid>
        <div className="col-span-full lg:col-span-5 lg:col-start-8">
          <H2 className="mb-32">You might be thinking, why pick a team?</H2>

          <H6 as="h3" className="mb-4">
            Gamify your learning.
          </H6>
          <Paragraph className="mb-12">
            Praesent eu lacus odio. Pellentesque vitae lectus tortor. Donec elit
            nunc, dictum quis condimentum in, impe rdiet at arcu.{' '}
          </Paragraph>
          <H6 as="h3" className="mb-4">
            Here will go the second title.
          </H6>
          <Paragraph className="mb-12">
            Mauris auctor nulla at felis placerat, ut elementum urna commodo.
            Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
            suscipit sem aenean turpis.
          </Paragraph>
          <H6 as="h3" className="mb-4">
            Here will go the third title.
          </H6>
          <Paragraph className="mb-12">
            Mauris auctor nulla at felis placerat, ut elementum urna commodo.
            Aenean et rutrum quam. Etiam odio massa, congue in orci nec, ornare
            suscipit sem aenean turpis.
          </Paragraph>
        </div>

        <div className="col-span-full lg:col-span-6 lg:col-start-1 lg:row-start-1">
          <div className="aspect-h-6 aspect-w-4">
            <img
              className="rounded-lg object-cover"
              src={images.kentPalmingSoccerBall()}
              alt={images.kentPalmingSoccerBall.alt}
            />
          </div>
        </div>
      </Grid>
    </div>
  )
}
