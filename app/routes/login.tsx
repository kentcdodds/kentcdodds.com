import React, {useEffect, useRef, useState} from 'react'
import {useRouteData, useSubmit} from '@remix-run/react'
import {json, redirect} from '@remix-run/data'
import type {ActionFunction, LoaderFunction} from '@remix-run/data'
import {
  getIdToken,
  signInWithEmail,
  signInWithGitHub,
} from '../utils/firebase.client'
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
  const idToken = params.get('idToken')
  if (!idToken) {
    console.error('No idToken param!')
    return redirect('/error')
  }

  try {
    return createUserSession(idToken)
  } catch (e: unknown) {
    const session = await rootStorage.getSession(request.headers.get('Cookie'))
    let message = 'Unknown error'
    if (e instanceof Error) {
      message = e.message
    }
    session.set('error', message)
    const cookie = await rootStorage.commitSession(session)

    return redirect(`/login`, {headers: {'Set-Cookie': cookie}})
  }
}

enum State {
  Idle = 'idle',
  GettingIdToken = 'getting id token',
  CreatingServerSession = 'creating server session',
  Error = 'error',
}

function LoginForm() {
  const [state, setState] = useState<State>(State.Idle)
  const [authMethod, setAuthMethod] = useState<'github' | 'password' | null>(
    null,
  )
  const [error, setError] = useState<Error | null>(null)
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
  })
  const submit = useSubmit()
  const data = useRouteData()
  const emailRef = useRef<HTMLInputElement>(null)

  const formIsValid =
    formValues.email.match(/.+@.+/) && formValues.password.length >= 6

  async function transition() {
    switch (state) {
      case State.GettingIdToken: {
        try {
          if (authMethod === 'github') {
            await signInWithGitHub()
          } else {
            await signInWithEmail(formValues.email, formValues.password)
          }
          setState(State.CreatingServerSession)
        } catch (e: unknown) {
          if (e instanceof Error) {
            setError(e)
          } else {
            setError(new Error(e as string))
          }
          setState(State.Error)
        }
        break
      }
      case State.CreatingServerSession: {
        // do the rest server-side with Remix
        const idToken = await getIdToken()
        if (!idToken) {
          console.error('Could not get an ID token')
          return
        }
        submit(
          {idToken},
          {
            // Remix has a bug in useSubmit requiring location.origin
            action: `${window.location.origin}/login`,
            replace: true,
            method: 'post',
          },
        )
        break
      }
      case State.Error: {
        if (authMethod === 'password') emailRef.current?.select()
        setTimeout(() => {
          setState(State.Idle)
        }, 3000)
        break
      }
      case State.Idle: {
        // do nothing
        break
      }
      default: {
        throw new Error(`Unhandled state ${state}`)
      }
    }
  }

  useEffect(() => {
    void transition()
    // hmmm... Ryan?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  useEffect(() => {
    // remix action returned an error, move the client side machine along
    if (state === State.CreatingServerSession && data.error) {
      setError(new Error(data.errorMessage))
      setState(State.Error)
    }
  }, [state, data])

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
        onSubmit={event => {
          event.preventDefault()
          setAuthMethod('password')
          setState(State.GettingIdToken)
        }}
      >
        <div className="-space-y-px rounded-md shadow-sm">
          <div>
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <input
              ref={emailRef}
              autoFocus
              aria-describedby={
                state === State.Error ? 'error-message' : 'message'
              }
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
            disabled={!formIsValid}
            className={`w-full py-2 px-4 border-2 border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:border-yellow-500 ${
              formIsValid ? '' : 'opacity-50'
            }`}
          >
            Sign in
          </button>
        </div>
        {error && (
          <p id="error-message" className="text-center text-red-600">
            {error.message}
          </p>
        )}
        <div className="sr-only" aria-live="polite">
          {formIsValid
            ? 'Sign in form is now valid and ready to submit'
            : 'Sign in form is now invalid.'}
        </div>
      </form>
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm leading-5">
          <span className="px-2 text-gray-300 bg-gray-900">Or you can</span>
        </div>
      </div>
      <div>
        <button
          onClick={() => {
            setAuthMethod('github')
            setState(State.GettingIdToken)
          }}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 border-2 border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:border-yellow-500"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  )
}

function Login() {
  const data = useRouteData()
  return (
    <div className="flex items-center justify-center min-h-screen px-4 pt-0 pb-12 bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md -mt-24 space-y-8">
        {data.loggedOut && <LoggedOutMessage />}
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
