import {
	type HotkeySequence,
	type RegisterableHotkey,
} from '@tanstack/react-hotkeys'

export const HOTKEY_TOGGLE_HOTKEYS_DIALOG = {
	key: '?',
	shift: true,
} as const satisfies RegisterableHotkey

export const HOTKEY_OPEN_SEARCH = {
	slash: '/',
	modK: 'Mod+K',
} as const

export const HOTKEY_GOTO_HOME = ['G', 'H'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_BLOG = ['G', 'B'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_COURSES = ['G', 'C'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_DISCORD = ['G', 'D'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_WORKSHOPS = ['G', 'W'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_ABOUT = ['G', 'A'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_TALKS = ['G', 'T'] as const satisfies HotkeySequence
export const HOTKEY_GOTO_SEARCH = ['G', 'S'] as const satisfies HotkeySequence

export type HotkeysHelpCombo =
	| { kind: 'hotkey'; hotkey: string }
	| { kind: 'sequence'; keys: Array<string> }

export type HotkeysHelpItem = {
	description: string
	combos: Array<HotkeysHelpCombo>
}

export type HotkeysHelpGroup = {
	title: string
	items: Array<HotkeysHelpItem>
}

function getSequenceDisplayKeys(sequence: ReadonlyArray<string>) {
	return sequence.map((key) => key.toLowerCase())
}

export const HOTKEYS_HELP_GROUPS = [
	{
		title: 'General',
		items: [
			{
				description: 'Show keyboard shortcuts',
				combos: [{ kind: 'hotkey', hotkey: '?' }],
			},
			{
				description: 'Close dialog',
				combos: [{ kind: 'hotkey', hotkey: 'Escape' }],
			},
		],
	},
	{
		title: 'Search',
		items: [
			{
				description: 'Focus search',
				combos: [
					{ kind: 'hotkey', hotkey: HOTKEY_OPEN_SEARCH.slash },
					{ kind: 'hotkey', hotkey: HOTKEY_OPEN_SEARCH.modK },
				],
			},
		],
	},
	{
		title: 'Navigation',
		items: [
			{
				description: 'Go to home',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_HOME) }],
			},
			{
				description: 'Go to blog',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_BLOG) }],
			},
			{
				description: 'Go to courses',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_COURSES) }],
			},
			{
				description: 'Go to Discord',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_DISCORD) }],
			},
			{
				description: 'Go to workshops',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_WORKSHOPS) }],
			},
			{
				description: 'Go to about',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_ABOUT) }],
			},
			{
				description: 'Go to talks',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_TALKS) }],
			},
			{
				description: 'Go to search page',
				combos: [{ kind: 'sequence', keys: getSequenceDisplayKeys(HOTKEY_GOTO_SEARCH) }],
			},
		],
	},
] as const satisfies Array<HotkeysHelpGroup>

