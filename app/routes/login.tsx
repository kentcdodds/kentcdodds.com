import * as React from 'react'
import type {ActionFunction, LoaderFunction} from 'remix'
import {useRouteData, json, redirect} from 'remix'
import {getDomainUrl} from '../utils/misc'
import {
  sendToken,
  getUser,
  rootStorage,
  signOutSession,
} from '../utils/session.server'

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
    session.flash('message', 'Email sent.')
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

  const [formValues, setFormValues] = React.useState({
    email: '',
  })

  const emailIsValid = formValues.email.match(/.+@.+/)
  const formIsValid = emailIsValid

  return (
    <div className="flex items-center justify-center pb-12 pt-0 px-4 min-h-screen bg-gray-900 sm:px-6 lg:px-8">
      <div className="-mt-24 w-full max-w-md space-y-8">
        <div className="mt-8">
          <div>Sign in (or sign up) to KCD</div>
          {data.message ? <div>{data.message}</div> : null}
          <form
            className="space-y-6"
            onChange={event => {
              const form = event.currentTarget
              setFormValues({email: form.email.value})
            }}
            action="/login"
            method="post"
          >
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  autoFocus
                  aria-describedby={data.error ? 'error-message' : 'message'}
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={data.email}
                  required
                  className="placeholder-gray-500 border-gray-700 relative focus:z-10 block px-3 py-2 w-full text-gray-200 bg-gray-800 border-2 focus:border-yellow-500 rounded-none rounded-t-md focus:outline-none appearance-none sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={!formIsValid}
                className={`w-50 py-2 px-4 border-2 border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:border-yellow-500 ${
                  formIsValid ? '' : 'opacity-50'
                }`}
              >
                Email a login link
              </button>
            </div>
            {data.error ? (
              <p id="error-message" className="text-red-600 text-center">
                {data.error}
              </p>
            ) : null}
            <div className="sr-only" aria-live="polite">
              {formIsValid
                ? 'Sign in form is now valid and ready to submit'
                : 'Sign in form is now invalid.'}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
