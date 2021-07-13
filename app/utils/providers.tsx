import * as React from 'react'
import {Team} from '@prisma/client'
import type {Await, User} from 'types'
import type {getUserInfo} from './user-info.server'

function createSimpleContext<ContextType>(name: string) {
  const defaultValue = Symbol(`Default ${name} context value`)
  const Context =
    React.createContext<ContextType | null | typeof defaultValue>(defaultValue)
  Context.displayName = name

  function useValue() {
    const value = React.useContext(Context)
    if (value === defaultValue) {
      throw new Error(`use${name} must be used within ${name}Provider`)
    }
    if (!value) {
      throw new Error(
        `No value in ${name}Provider context. If the value is optional in this situation, try useOptional${name} instead of use${name}`,
      )
    }
    return value
  }

  function useOptionalValue() {
    const value = React.useContext(Context)
    if (value === defaultValue) {
      throw new Error(`useOptional${name} must be used within ${name}Provider`)
    }
    return value
  }

  return {Provider: Context.Provider, useValue, useOptionalValue}
}

type RequestInfo = {
  origin: string
  searchParams: string
  session: {email: string | null; hasActiveMagicLink: boolean}
}
const {Provider: RequestInfoProvider, useValue: useRequestInfo} =
  createSimpleContext<RequestInfo>('RequestInfo')

type UserInfo = Await<ReturnType<typeof getUserInfo>>
const {
  Provider: UserInfoProvider,
  useValue: useUserInfo,
  useOptionalValue: useOptionalUserInfo,
} = createSimpleContext<UserInfo>('UserInfo')

const {
  Provider: UserProvider,
  useValue: useUser,
  useOptionalValue: useOptionalUser,
} = createSimpleContext<User>('User')

const unknownTeam = {UNKNOWN: 'UNKNOWN'} as const
const optionalTeams = {...Team, ...unknownTeam}
type OptionalTeam = typeof optionalTeams[keyof typeof optionalTeams]
const {Provider: TeamProviderBase, useValue: useTeam} =
  createSimpleContext<
    [OptionalTeam, React.Dispatch<React.SetStateAction<OptionalTeam>>]
  >('Team')

function TeamProvider({
  children,
}: {
  children: React.ReactNode | Array<React.ReactNode>
}) {
  const user = useOptionalUser()
  const [team, setTeam] = React.useState<OptionalTeam>(unknownTeam.UNKNOWN)

  // if the user logs out, we want to reset the team to unknown
  React.useEffect(() => {
    if (!user) setTeam(unknownTeam.UNKNOWN)
  }, [user])
  // NOTE: calling set team will do nothing if we're given an actual team
  return (
    <TeamProviderBase value={[user?.team ?? team, setTeam]}>
      {children}
    </TeamProviderBase>
  )
}

type ChatsEpisodeUIState = {
  sortOrder: 'desc' | 'asc'
}
const {
  Provider: ChatsEpisodeUIStateProvider,
  useValue: useChatsEpisodeUIState,
} = createSimpleContext<ChatsEpisodeUIState>('ChatsEpisodeUIState')

export {
  RequestInfoProvider,
  useRequestInfo,
  UserInfoProvider,
  useUserInfo,
  useOptionalUserInfo,
  UserProvider,
  useUser,
  useOptionalUser,
  TeamProvider,
  useTeam,
  optionalTeams,
  ChatsEpisodeUIStateProvider,
  useChatsEpisodeUIState,
}
export type {RequestInfo, OptionalTeam}
