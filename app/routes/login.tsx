import * as React from 'react'
import {useRouteData} from '@remix-run/react'
import {json, redirect} from '@remix-run/data'
import type {ActionFunction, LoaderFunction} from '@remix-run/data'
import {createEmailUser, signInWithEmail} from '../utils/firebase.server'
import {
  getCustomer,
  rootStorage,
  createUserSession,
} from '../utils/session.server'

export const loader: LoaderFunction = async ({request}) => {
  const customer = await getCustomer(request)
  if (customer) return redirect('/me')

  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  const cookie = await rootStorage.destroySession(session)

  return json(
    {error: session.get('error'), loggedOut: session.get('loggedOut')},
    {headers: {'Set-Cookie': cookie}},
  )
}

export const action: ActionFunction = async ({request}) => {
  const params = new URLSearchParams(await request.text())
  const email = params.get('email')
  const password = params.get('password')
  const create = params.get('type') === 'register'
  const session = await rootStorage.getSession(request.headers.get('Cookie'))
  if (!email || !password) {
    session.set('error', 'Email and password are required')
    const cookie = await rootStorage.commitSession(session)
    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  }
  let user
  try {
    const data = create
      ? await createEmailUser(email, password)
      : await signInWithEmail(email, password)
    user = data.user
    if (!user) {
      session.set('error', 'Email and password are required')
      const cookie = await rootStorage.commitSession(session)
      return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
    }
  } catch (e: unknown) {
    let message = 'Unknown error'
    if (e instanceof Error) {
      message = e.message
    }
    session.set('error', message)
    const cookie = await rootStorage.commitSession(session)

    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  }
  const token = await user.getIdToken()
  return createUserSession(token)
}

function LoginForm() {
  const data = useRouteData()

  const [formValues, setFormValues] = React.useState({
    email: '',
    password: '',
  })
  const emailRef = React.useRef<HTMLInputElement>(null)

  const formIsValid =
    formValues.email.match(/.+@.+/) && formValues.password.length >= 6

  return (
    <div className="mt-8">
      <form
        className="space-y-6"
        onChange={event => {
          const form = event.currentTarget
          setFormValues({
            email: form.email.value,
            password: form.password.value,
          })
        }}
        action="/login"
        method="post"
      >
        <div className="-space-y-px rounded-md shadow-sm">
          <div>
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <input
              ref={emailRef}
              autoFocus
              aria-describedby={data.error ? 'error-message' : 'message'}
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={data.email}
              required
              className="relative block w-full px-3 py-2 text-gray-200 placeholder-gray-500 bg-gray-800 border-2 border-gray-700 rounded-none appearance-none rounded-t-md focus:outline-none focus:border-yellow-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="off"
              required
              minLength={6}
              className="relative block w-full px-3 py-2 -mt-1 text-gray-200 placeholder-gray-500 bg-gray-800 border-2 border-gray-700 rounded-none appearance-none rounded-b-md focus:outline-none focus:border-yellow-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            name="type"
            value="register"
            disabled={!formIsValid}
            className={`w-50 py-2 px-4 border-2 border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:border-yellow-500 ${
              formIsValid ? '' : 'opacity-50'
            }`}
          >
            Register
          </button>
          <button
            type="submit"
            name="type"
            value="sign in"
            disabled={!formIsValid}
            className={`w-50 py-2 px-4 border-2 border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:border-yellow-500 ${
              formIsValid ? '' : 'opacity-50'
            }`}
          >
            Sign in
          </button>
        </div>
        {data.error ? (
          <p id="error-message" className="text-center text-red-600">
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
  )
}

function Login() {
  const data = useRouteData()
  return (
    <div className="flex items-center justify-center min-h-screen px-4 pt-0 pb-12 bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md -mt-24 space-y-8">
        {data.loggedOut ? <LoggedOutMessage /> : null}
        <LoginForm />
      </div>
    </div>
  )
}

function LoggedOutMessage() {
  return (
    <div className="max-w-lg p-4 mx-auto mt-10 text-left rounded-md bg-green-950">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-green-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium leading-5 text-green-300">
            You have been logged out
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
