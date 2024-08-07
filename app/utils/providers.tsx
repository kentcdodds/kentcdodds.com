import { useMatches } from '@remix-run/react'
import * as React from 'react'
import { type KCDHandle } from '#app/types.ts'

// This utility is handy, but in Remix apps these days you really shouldn't need
// context all that much. Instead you can useOutletContext: https://reactrouter.com/en/main/hooks/use-outlet-context
function createSimpleContext<ContextType>(name: string) {
	const defaultValue = Symbol(`Default ${name} context value`)
	const Context = React.createContext<ContextType | null | typeof defaultValue>(
		defaultValue,
	)
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

	return { Provider: Context.Provider, useValue, useOptionalValue }
}

type ChatsEpisodeUIState = {
	sortOrder: 'desc' | 'asc'
}
const {
	Provider: ChatsEpisodeUIStateProvider,
	useValue: useChatsEpisodeUIState,
} = createSimpleContext<ChatsEpisodeUIState>('ChatsEpisodeUIState')

type CallsEpisodeUIState = {
	sortOrder: 'desc' | 'asc'
}
const {
	Provider: CallsEpisodeUIStateProvider,
	useValue: useCallsEpisodeUIState,
} = createSimpleContext<CallsEpisodeUIState>('CallsEpisodeUIState')

function useMatchLoaderData<LoaderData>(handleId: string) {
	const matches = useMatches()
	const match = matches.find(
		({ handle }) => (handle as KCDHandle | undefined)?.id === handleId,
	)
	if (!match) {
		throw new Error(`No active route has a handle ID of ${handleId}`)
	}
	return match.data as LoaderData
}
function useOptionalMatchLoaderData<LoaderData>(handleId: string) {
	const matches = useMatches()
	return matches.find(
		({ handle }) => (handle as KCDHandle | undefined)?.id === handleId,
	)?.data as LoaderData | undefined
}

export {
	createSimpleContext,
	ChatsEpisodeUIStateProvider,
	useChatsEpisodeUIState,
	CallsEpisodeUIStateProvider,
	useCallsEpisodeUIState,
	useMatchLoaderData,
	useOptionalMatchLoaderData,
}
