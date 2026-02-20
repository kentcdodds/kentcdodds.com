import { describe, expect, test } from 'vitest'
import {
	HOTKEY_GOTO_CALLS,
	HOTKEY_GOTO_CHATS,
	HOTKEY_GOTO_COURSES,
	HOTKEY_GOTO_KODY,
	HOTKEY_GOTO_RESUME,
	HOTKEY_GOTO_TESTIMONY,
	HOTKEY_GOTO_TRANSPARENCY,
	HOTKEYS_HELP_GROUPS,
} from '../hotkeys.ts'

describe('hotkeys navigation mappings', () => {
	test('matches the expected key sequences', () => {
		expect(HOTKEY_GOTO_CHATS).toEqual(['G', 'C'])
		expect(HOTKEY_GOTO_CALLS).toEqual(['G', 'P'])
		expect(HOTKEY_GOTO_COURSES).toEqual(['G', 'U'])
		expect(HOTKEY_GOTO_TESTIMONY).toEqual(['G', 'F'])
		expect(HOTKEY_GOTO_TRANSPARENCY).toEqual(['G', 'M'])
		expect(HOTKEY_GOTO_RESUME).toEqual(['G', 'R'])
		expect(HOTKEY_GOTO_KODY).toEqual(['G', 'K'])
	})

	test('shows the new bindings in keyboard shortcuts help', () => {
		const navigationGroup = HOTKEYS_HELP_GROUPS.find(
			(group) => group.title === 'Navigation',
		)
		expect(navigationGroup).toBeDefined()

		const itemByDescription = new Map(
			navigationGroup!.items.map((item) => [item.description, item]),
		)

		expect(itemByDescription.get('Go to Chats with Kent podcast')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'c'] }],
		})
		expect(itemByDescription.get('Go to Call Kent podcast')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'p'] }],
		})
		expect(itemByDescription.get('Go to courses')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'u'] }],
		})
		expect(itemByDescription.get('Go to testimony')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'f'] }],
		})
		expect(itemByDescription.get('Go to transparency')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'm'] }],
		})
		expect(itemByDescription.get('Go to resume')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'r'] }],
		})
		expect(itemByDescription.get('Go to kody')).toMatchObject({
			combos: [{ kind: 'sequence', keys: ['g', 'k'] }],
		})
	})
})
