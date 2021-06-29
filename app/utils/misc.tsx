import * as React from 'react'
import {Link} from 'remix'
import type {NonNullProperties, User, Request, Await, Team} from 'types'
import md5 from 'md5-hash'
import {images} from '../images'
import type {getUserInfo} from './user-info.server'
import type {getEnv} from './env.server'

const useSSRLayoutEffect =
  typeof window === 'undefined' ? () => {} : React.useLayoutEffect

function getAvatar(
  email: string,
  {
    size = 128,
    fallback = images.alexProfileGray.src,
  }: {size?: number; fallback?: string} = {},
) {
  const hash = md5(email)
  const url = new URL(`https://www.gravatar.com/avatar/${hash}`)
  url.searchParams.set('size', String(size))
  url.searchParams.set('default', fallback)
  return url.toString()
}

const avatarFallbacks: Record<Team, string> = {
  BLUE: images.alexProfileBlue.src,
  RED: images.alexProfileRed.src,
  YELLOW: images.alexProfileYellow.src,
}

function getAvatarForUser({
  email,
  team,
  firstName,
}: Pick<User, 'email' | 'team' | 'firstName'>) {
  return {
    src: getAvatar(email, {fallback: avatarFallbacks[team]}),
    alt: firstName,
  }
}

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

function createSimpleContext<ContextType>({name}: {name: string}) {
  const defaultValue = Symbol(`Default ${name} context value`)
  const Context =
    React.createContext<ContextType | null | typeof defaultValue>(defaultValue)
  Context.displayName = name

  function useValue() {
    const user = React.useContext(Context)
    if (user === defaultValue) {
      throw new Error(`use${name} must be used within ${name}Provider`)
    }
    if (!user) {
      throw new Error(
        `No value in ${name}Provider context. If the value is optional in this situation, try useOptional${name} instead of use${name}`,
      )
    }
    return user
  }

  function useOptionalValue() {
    const user = React.useContext(Context)
    if (user === defaultValue) {
      throw new Error(`useOptional${name} must be used within ${name}Provider`)
    }
    return user
  }

  return {Provider: Context.Provider, useValue, useOptionalValue}
}

type RequestInfo = {origin: string}
const {Provider: RequestInfoProvider, useValue: useRequestInfo} =
  createSimpleContext<{origin: string}>({name: 'RequestInfo'})

type UserInfo = Await<ReturnType<typeof getUserInfo>>
const {
  Provider: UserInfoProvider,
  useValue: useUserInfo,
  useOptionalValue: useOptionalUserInfo,
} = createSimpleContext<UserInfo>({name: 'UserInfo'})

const {
  Provider: UserProvider,
  useValue: useUser,
  useOptionalValue: useOptionalUser,
} = createSimpleContext<User>({name: 'User'})

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string,
): asserts possibleNull is Exclude<PossibleNullType, null> {
  if (possibleNull === null) throw new Error(errorMessage)
}

function getRequiredEnvVarFromObj(
  obj: Record<string, string | undefined>,
  key: string,
  devValue: string = `${key}-dev-value`,
) {
  let value = devValue
  const envVal = obj[key]
  if (envVal) {
    value = envVal
  } else if (obj.NODE_ENV === 'production') {
    throw new Error(`${key} is a required env variable`)
  }
  return value
}

function getRequiredServerEnvVar(key: string, devValue?: string) {
  return getRequiredEnvVarFromObj(process.env, key, devValue)
}

function getRequiredGlobalEnvVar(
  key: keyof ReturnType<typeof getEnv>,
  devValue?: string,
) {
  return getRequiredEnvVarFromObj(ENV, key, devValue)
}

function getDiscordAuthorizeURL(domainUrl: string) {
  const url = new URL('https://discord.com/api/oauth2/authorize')
  url.searchParams.set(
    'client_id',
    getRequiredGlobalEnvVar('DISCORD_CLIENT_ID'),
  )
  url.searchParams.set('redirect_uri', `${domainUrl}/discord/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify guilds.join email guilds')
  return url.toString()
}

function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
  if (!host) {
    throw new Error('Could not determine domain URL.')
  }
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export {
  getAvatar,
  getAvatarForUser,
  useSSRLayoutEffect,
  AnchorOrLink,
  useAsync,
  getErrorMessage,
  getNonNull,
  assertNonNull,
  getRequiredServerEnvVar,
  getRequiredGlobalEnvVar,
  getDiscordAuthorizeURL,
  getDomainUrl,
  RequestInfoProvider,
  useRequestInfo,
  UserInfoProvider,
  useUserInfo,
  useOptionalUserInfo,
  UserProvider,
  useUser,
  useOptionalUser,
}

export type {RequestInfo}
/*
eslint
  @typescript-eslint/no-shadow: "off",
*/
