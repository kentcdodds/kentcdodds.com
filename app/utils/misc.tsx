import * as React from 'react'
import {Link} from 'react-router-dom'
import type {NonNullProperties, User} from 'types'
import md5 from 'md5-hash'

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

const getAvatar = (email: string, {size = 128}: {size?: number} = {}) =>
  `https://www.gravatar.com/avatar/${md5(email)}?s=${size}`

type AnchorProps = React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>

function AnchorOrLink(props: AnchorProps) {
  const {href = '', ...rest} = props
  if (href.startsWith('http')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a {...props} />
  } else {
    // @ts-expect-error I'm not sure what to do about extra props other than to forward them
    return <Link to={href} {...rest} />
  }
}

type Status = 'idle' | 'pending' | 'rejected' | 'resolved'
function useAsync<Data>(
  initialState: {
    status?: Status
    data?: Data | null
    error?: Error | null
  } = {},
) {
  type AsyncState = Required<typeof initialState>
  type Action = Partial<AsyncState>

  const latestRef = React.useRef<number>(1)
  const initialStateRef = React.useRef<AsyncState>({
    status: 'idle',
    data: null,
    error: null,
    ...initialState,
  })
  const [{status, data, error}, setState] = React.useReducer(
    (s: AsyncState, a: Action) => ({...s, ...a}),
    initialStateRef.current,
  )

  const safeSetState = useSafeDispatch(setState)

  const setData = React.useCallback(
    (data: Data) => safeSetState({data, status: 'resolved'}),
    [safeSetState],
  )
  const setError = React.useCallback(
    (error: Error) => safeSetState({error, status: 'rejected'}),
    [safeSetState],
  )
  const reset = React.useCallback(
    () => safeSetState(initialStateRef.current),
    [safeSetState],
  )

  const run = React.useCallback(
    (promise: Promise<Data>) => {
      const id = latestRef.current++
      safeSetState({status: 'pending'})
      return promise.then(
        data => {
          if (id === latestRef.current) setData(data)
          return data
        },
        (error: Error) => {
          if (id === latestRef.current) setError(error)
          return Promise.reject(error)
        },
      )
    },
    [safeSetState, setData, setError],
  )

  return {
    isIdle: status === 'idle',
    isLoading: status === 'pending',
    isError: status === 'rejected',
    isSuccess: status === 'resolved',

    setData,
    setError,
    error,
    status,
    data,
    run,
    reset,
  }
}

function useSafeDispatch<Action>(
  dispatch: (action: Action) => void,
): typeof dispatch {
  const mounted = React.useRef(false)
  useSSRLayoutEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return React.useCallback(
    action => {
      if (mounted.current) dispatch(action)
    },
    [dispatch],
  )
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown Error'
}

function getNonNull<Type extends Record<string, null | unknown>>(
  obj: Type,
): NonNullProperties<Type> {
  for (const [key, val] of Object.entries(obj)) {
    assertNonNull(val, `The value of ${key} is null but it should not be.`)
  }
  return obj as NonNullProperties<Type>
}

const UserContext = React.createContext<User | null | undefined>(undefined)

function UserProvider({
  user,
  children,
}: {
  user: User | null
  children: React.ReactNode
}) {
  return <UserContext.Provider value={user} children={children} />
}

function useUser() {
  const user = React.useContext(UserContext)
  if (user === undefined) {
    throw new Error('useUser must be used within UserProvider')
  }
  if (!user) {
    throw new Error(
      'No user value in UserProvider context. If the user is optional in this situation, use useOptionalUser instead of useUser',
    )
  }
  return user
}

function useOptionalUser() {
  const user = React.useContext(UserContext)
  if (user === undefined) {
    throw new Error('useOptionalUser must be used within UserProvider')
  }
  return user
}

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string,
): asserts possibleNull is Exclude<PossibleNullType, null> {
  if (possibleNull === null) throw new Error(errorMessage)
}

export {
  getAvatar,
  useSSRLayoutEffect,
  AnchorOrLink,
  useAsync,
  getErrorMessage,
  getNonNull,
  assertNonNull,
  UserProvider,
  useUser,
  useOptionalUser,
}

/*
eslint
  @typescript-eslint/no-shadow: "off",
*/
