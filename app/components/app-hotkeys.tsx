import { getSequenceManager, useHotkey } from '@tanstack/react-hotkeys'
import * as React from 'react'
import { useLocation, useNavigate } from 'react-router'
import * as hk from '#app/utils/hotkeys.ts'
import { HotkeysHelpDialog } from './hotkeys-help-dialog.tsx'

const navSequenceOptions = {
	ignoreInputs: true,
	preventDefault: true,
	stopPropagation: true,
	timeout: 800,
}

const NAVIGATION_HOTKEY_ROUTES = [
	{ sequence: hk.HOTKEY_GOTO_HOME, path: '/' },
	{ sequence: hk.HOTKEY_GOTO_BLOG, path: '/blog' },
	{ sequence: hk.HOTKEY_GOTO_CHATS, path: '/chats' },
	{ sequence: hk.HOTKEY_GOTO_CALLS, path: '/calls' },
	{ sequence: hk.HOTKEY_GOTO_COURSES, path: '/courses' },
	{ sequence: hk.HOTKEY_GOTO_DISCORD, path: '/discord' },
	{ sequence: hk.HOTKEY_GOTO_ABOUT, path: '/about' },
	{ sequence: hk.HOTKEY_GOTO_TALKS, path: '/talks' },
	{ sequence: hk.HOTKEY_GOTO_TESTIMONY, path: '/testimony' },
	{ sequence: hk.HOTKEY_GOTO_TRANSPARENCY, path: '/transparency' },
	{ sequence: hk.HOTKEY_GOTO_RESUME, path: '/resume' },
	{ sequence: hk.HOTKEY_GOTO_KODY, path: '/kody' },
	{ sequence: hk.HOTKEY_GOTO_SEARCH, path: '/search' },
] as const

function AppHotkeys() {
	const navigate = useNavigate()
	const location = useLocation()
	const [dialogOpen, setDialogOpen] = React.useState(false)
	const navigateToPath = React.useCallback(
		(path: string) => {
			setDialogOpen(false)
			void navigate(path)
		},
		[navigate],
	)

	// Close the dialog when navigation happens (mouse/touch or hotkeys).
	React.useEffect(() => {
		setDialogOpen(false)
	}, [location.pathname])

	useHotkey(
		hk.HOTKEY_TOGGLE_HOTKEYS_DIALOG,
		() => setDialogOpen((o) => !o),
		{
			ignoreInputs: true,
			preventDefault: true,
			requireReset: true,
			stopPropagation: true,
		},
	)

	React.useEffect(() => {
		const sequenceManager = getSequenceManager()
		const unregisterCallbacks = NAVIGATION_HOTKEY_ROUTES.map(({ sequence, path }) =>
			sequenceManager.register([...sequence], () => navigateToPath(path), navSequenceOptions),
		)

		return () => {
			for (const unregister of unregisterCallbacks) unregister()
		}
	}, [navigateToPath])

	return (
		<HotkeysHelpDialog
			isOpen={dialogOpen}
			onDismiss={() => setDialogOpen(false)}
			groups={hk.HOTKEYS_HELP_GROUPS}
		/>
	)
}

export { AppHotkeys }

