import type { HotkeySequence, RegisterableHotkey } from '@tanstack/hotkeys'

export const HOTKEY_TOGGLE_HOTKEYS_DIALOG = {
	key: '?',
	shift: true,
} as const satisfies RegisterableHotkey

export const HOTKEY_OPEN_SEARCH = {
	slash: '/',
	modK: 'Mod+K',
	modShiftP: 'Mod+Shift+P',
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
					{ kind: 'hotkey', hotkey: HOTKEY_OPEN_SEARCH.modShiftP },
				],
			},
		],
	},
	{
		title: 'Navigation',
		items: [
			{
				description: 'Go to home',
				combos: [{ kind: 'sequence', keys: ['g', 'h'] }],
			},
			{
				description: 'Go to blog',
				combos: [{ kind: 'sequence', keys: ['g', 'b'] }],
			},
			{
				description: 'Go to courses',
				combos: [{ kind: 'sequence', keys: ['g', 'c'] }],
			},
			{
				description: 'Go to Discord',
				combos: [{ kind: 'sequence', keys: ['g', 'd'] }],
			},
			{
				description: 'Go to workshops',
				combos: [{ kind: 'sequence', keys: ['g', 'w'] }],
			},
			{
				description: 'Go to about',
				combos: [{ kind: 'sequence', keys: ['g', 'a'] }],
			},
			{
				description: 'Go to talks',
				combos: [{ kind: 'sequence', keys: ['g', 't'] }],
			},
			{
				description: 'Go to search page',
				combos: [{ kind: 'sequence', keys: ['g', 's'] }],
			},
		],
	},
] as const satisfies Array<HotkeysHelpGroup>

