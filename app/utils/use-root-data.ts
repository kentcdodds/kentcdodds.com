// this is needed by things the root needs, so to avoid circular deps we have to
// put it in its own file which is silly I know...

import {handle, type LoaderData} from '../root'
import {useMatchLoaderData} from './providers'

export const useRootData = () => useMatchLoaderData<LoaderData>(handle.id)
export function useUser() {
  const {user} = useRootData()
  if (!user) throw new Error('User is required when using useUser')
  return user
}

export function useOptionalUser() {
  const {user} = useRootData()
  return user
}
