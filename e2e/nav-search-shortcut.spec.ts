import { type Page, expect, test } from '@playwright/test'

type ShortcutEvent = {
	key: string
	code: string
	ctrlKey?: boolean
	shiftKey?: boolean
	metaKey?: boolean
}

async function dispatchShortcut(page: Page, shortcut: ShortcutEvent) {
	return page.evaluate((eventInit) => {
		const event = new KeyboardEvent('keydown', {
			...eventInit,
			bubbles: true,
			cancelable: true,
		})
		document.dispatchEvent(event)
		return {
			cancelable: event.cancelable,
			defaultPrevented: event.defaultPrevented,
		}
	}, shortcut)
}

async function dispatchUntilPrevented(page: Page, shortcut: ShortcutEvent) {
	// Hotkeys are installed in `useEffect`, so retry until handlers are active.
	let result = await dispatchShortcut(page, shortcut)
	for (let i = 0; i < 40 && !result.defaultPrevented; i++) {
		await page.waitForTimeout(50)
		result = await dispatchShortcut(page, shortcut)
	}
	return result
}

test('slash opens nav search and focuses it', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	const searchInput = page.locator(
		'input[placeholder="Semantic search..."]:visible',
	)

	const result = await dispatchUntilPrevented(page, {
		key: '/',
		code: 'Slash',
	})
	expect(result.cancelable).toBe(true)
	expect(result.defaultPrevented).toBe(true)

	await expect(searchInput).toBeVisible()
	await expect(searchInput).toBeFocused()
})

test('ctrl/cmd+k opens nav search and focuses it', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	const searchInput = page.locator(
		'input[placeholder="Semantic search..."]:visible',
	)

	const result = await dispatchUntilPrevented(page, {
		key: 'k',
		code: 'KeyK',
		ctrlKey: true,
	})
	expect(result.cancelable).toBe(true)
	expect(result.defaultPrevented).toBe(true)

	await expect(searchInput).toBeVisible()
	await expect(searchInput).toBeFocused()
})

test('ctrl/cmd+shift+p does not open nav search', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	const searchInput = page.locator(
		'input[placeholder="Semantic search..."]:visible',
	)

	const result = await dispatchShortcut(page, {
		key: 'P',
		code: 'KeyP',
		ctrlKey: true,
		shiftKey: true,
	})
	expect(result.cancelable).toBe(true)
	expect(result.defaultPrevented).toBe(false)

	await expect(searchInput).not.toBeVisible()
})
