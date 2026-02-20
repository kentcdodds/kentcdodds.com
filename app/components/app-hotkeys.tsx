import { useHotkey, useHotkeySequence } from '@tanstack/react-hotkeys'
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

function AppHotkeys() {
	const navigate = useNavigate()
	const location = useLocation()
	const [dialogOpen, setDialogOpen] = React.useState(false)

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

	useHotkeySequence(
		hk.HOTKEY_GOTO_HOME,
		() => {
			setDialogOpen(false)
			void navigate('/')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_BLOG,
		() => {
			setDialogOpen(false)
			void navigate('/blog')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_CHATS,
		() => {
			setDialogOpen(false)
			void navigate('/chats')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_CALLS,
		() => {
			setDialogOpen(false)
			void navigate('/calls')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_COURSES,
		() => {
			setDialogOpen(false)
			void navigate('/courses')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_DISCORD,
		() => {
			setDialogOpen(false)
			void navigate('/discord')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_WORKSHOPS,
		() => {
			setDialogOpen(false)
			void navigate('/workshops')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_ABOUT,
		() => {
			setDialogOpen(false)
			void navigate('/about')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_TALKS,
		() => {
			setDialogOpen(false)
			void navigate('/talks')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_TESTIMONY,
		() => {
			setDialogOpen(false)
			void navigate('/testimony')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_TRANSPARENCY,
		() => {
			setDialogOpen(false)
			void navigate('/transparency')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_RESUME,
		() => {
			setDialogOpen(false)
			void navigate('/resume')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_KODY,
		() => {
			setDialogOpen(false)
			void navigate('/kody')
		},
		navSequenceOptions,
	)

	useHotkeySequence(
		hk.HOTKEY_GOTO_SEARCH,
		() => {
			setDialogOpen(false)
			void navigate('/search')
		},
		navSequenceOptions,
	)

	return (
		<HotkeysHelpDialog
			isOpen={dialogOpen}
			onDismiss={() => setDialogOpen(false)}
			groups={hk.HOTKEYS_HELP_GROUPS}
		/>
	)
}

export { AppHotkeys }

