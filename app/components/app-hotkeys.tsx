import { useLocation, useNavigate } from '@remix-run/react'
import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys'
import * as React from 'react'
import {
	HOTKEY_GOTO_ABOUT,
	HOTKEY_GOTO_BLOG,
	HOTKEY_GOTO_COURSES,
	HOTKEY_GOTO_DISCORD,
	HOTKEY_GOTO_HOME,
	HOTKEY_GOTO_SEARCH,
	HOTKEY_GOTO_TALKS,
	HOTKEY_GOTO_WORKSHOPS,
	HOTKEY_TOGGLE_HOTKEYS_DIALOG,
	HOTKEYS_HELP_GROUPS,
} from '#app/utils/hotkeys.ts'
import { HotkeysHelpDialog } from './hotkeys-help-dialog.tsx'

function AppHotkeys() {
	const navigate = useNavigate()
	const location = useLocation()
	const [dialogOpen, setDialogOpen] = React.useState(false)

	// Close the dialog when navigation happens (mouse/touch or hotkeys).
	React.useEffect(() => {
		setDialogOpen(false)
	}, [location.pathname])

	useHotkey(
		HOTKEY_TOGGLE_HOTKEYS_DIALOG,
		() => setDialogOpen((o) => !o),
		{
			ignoreInputs: true,
			preventDefault: true,
			requireReset: true,
			stopPropagation: true,
		},
	)

	const navSequenceOptions = React.useMemo(
		() => ({
			ignoreInputs: true,
			preventDefault: true,
			stopPropagation: true,
			timeout: 800,
		}),
		[],
	)

	useHotkeySequence(
		HOTKEY_GOTO_HOME,
		() => {
			setDialogOpen(false)
			navigate('/')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_BLOG,
		() => {
			setDialogOpen(false)
			navigate('/blog')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_COURSES,
		() => {
			setDialogOpen(false)
			navigate('/courses')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_DISCORD,
		() => {
			setDialogOpen(false)
			navigate('/discord')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_WORKSHOPS,
		() => {
			setDialogOpen(false)
			navigate('/workshops')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_ABOUT,
		() => {
			setDialogOpen(false)
			navigate('/about')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_TALKS,
		() => {
			setDialogOpen(false)
			navigate('/talks')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		HOTKEY_GOTO_SEARCH,
		() => {
			setDialogOpen(false)
			navigate('/search')
		},
		navSequenceOptions,
	)

	return (
		<HotkeysHelpDialog
			isOpen={dialogOpen}
			onDismiss={() => setDialogOpen(false)}
			groups={HOTKEYS_HELP_GROUPS}
		/>
	)
}

export { AppHotkeys }

