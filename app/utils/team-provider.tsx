import * as React from 'react'
import {OptionalTeam, unknownTeam} from './misc'
import {createSimpleContext} from './providers'
import {useRootData} from './use-root-data'

const {Provider: TeamProviderBase, useValue: useTeam} =
  createSimpleContext<
    [OptionalTeam, React.Dispatch<React.SetStateAction<OptionalTeam>>]
  >('Team')
export {useTeam}

export function TeamProvider({
  children,
}: {
  children: React.ReactNode | Array<React.ReactNode>
}) {
  const {user} = useRootData()
  const [team, setTeam] = React.useState<OptionalTeam>(unknownTeam.UNKNOWN)

  // if the user logs out, we want to reset the team to unknown
  React.useEffect(() => {
    if (!user) setTeam(unknownTeam.UNKNOWN)
  }, [user])
  // NOTE: calling set team will do nothing useful if we're given an actual team
  return (
    <TeamProviderBase value={[user?.team ?? team, setTeam]}>
      {children}
    </TeamProviderBase>
  )
}
