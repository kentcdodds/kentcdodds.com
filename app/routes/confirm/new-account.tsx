import * as React from 'react'
import {json, redirect, useRouteData} from 'remix'
import type {ActionFunction, LoaderFunction} from 'remix'
import type {Team} from 'types'
import {rootStorage, signInSession} from '../../utils/session.server'
import {
  createSession,
  prisma,
  teams,
  validateMagicLink,
} from '../../utils/prisma.server'
import {getErrorMessage, getNonNull} from '../../utils/misc'

type LoaderData = {
  email: string
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
  const email = session.get('email')
  const magicLink = session.get('magicLink')
  try {
    if (typeof email !== 'string' || typeof magicLink !== 'string') {
      throw new Error('email and magicLink required.')
    }

    // The user should only be able to get to this page after we've already
    // validated the magic link. But we'll validate it again anyway because
    // otherwise a user could request a link to an email address they don't
    // own to get that email address in their session and then come to this
    // page directly and create an account for that address. So we put the
    // magicLink in their session and validate it again before creating an
    // account for them.
    await validateMagicLink(email, magicLink)
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
    return redirect('/confirm/new-account', {
      headers: {
        'Set-Cookie': await rootStorage.commitSession(session),
      },
    })
  }

  const {firstName, team} = getNonNull(formData)

  try {
    const user = await prisma.user.create({data: {email, firstName, team}})
    const userSession = await createSession({userId: user.id})
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
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const values: LoaderData = {
    email: session.get('email'),
    errors: session.get(errorSessionKey),
    fields: session.get(fieldsSessionKey),
  }
  return json(values, {
    headers: {
      'Set-Cookie': await rootStorage.commitSession(session),
    },
  })
}

export default function NewAccount() {
  const data = useRouteData<LoaderData>()
  return (
    <div>
      <h1>Welcome to kentcdodds.com</h1>
      <p>To create your account for {data.email}, choose your team:</p>
      <form method="post" noValidate>
        <div>
          <label htmlFor="firstName">First Name: </label>
          <input
            name="firstName"
            id="firstName"
            required
            defaultValue={data.fields?.firstName ?? ''}
          />
          {data.errors?.firstName ? (
            <div
              role="alert"
              className="text-red-800 dark:text-red-300"
              id="body-error"
            >
              {data.errors.firstName}
            </div>
          ) : null}
        </div>
        <div>
          <fieldset>
            <legend>Team</legend>
            <label>
              <input type="radio" name="team" value="BLUE" /> Blue
            </label>
            <label>
              <input type="radio" name="team" value="RED" /> Red
            </label>
            <label>
              <input type="radio" name="team" value="YELLOW" /> Yellow
            </label>
          </fieldset>
          {data.errors?.team ? (
            <div
              role="alert"
              className="text-red-800 dark:text-red-300"
              id="body-error"
            >
              {data.errors.team}
            </div>
          ) : null}
        </div>
        <div>
          <button type="submit">Join KCD</button>
        </div>
      </form>
      <small>
        Or <a href="/">return to the home page</a>
      </small>
    </div>
  )
}
