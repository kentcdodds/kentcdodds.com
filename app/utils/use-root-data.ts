// this is needed by things the root needs, so to avoid circular deps we have to
// put it in its own file which is silly I know...

import { type SerializeFrom } from '@remix-run/server-runtime'
import { handle, type RootLoaderType } from '../root.tsx'
import { useMatchLoaderData } from './providers.tsx'

export const useRootData = () =>
	useMatchLoaderData<SerializeFrom<RootLoaderType>>(handle.id)
export function useUser() {
	const { user } = useRootData()
	if (!user) throw new Error('User is required when using useUser')
	return user
}

export function useOptionalUser() {
	const { user } = useRootData()
	return user
}
