import { expect, test } from '@playwright/test'

test('ctrl/cmd+shift+p opens nav search and focuses it', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	const searchInput = page.locator(
		'input[placeholder="Semantic search..."]:visible',
	)

	const dispatchShortcut = () => {
		return page.evaluate(() => {
			const event = new KeyboardEvent('keydown', {
				key: 'P',
				code: 'KeyP',
				ctrlKey: true,
				shiftKey: true,
				bubbles: true,
				cancelable: true,
			})
			document.dispatchEvent(event)
			return {
				cancelable: event.cancelable,
				defaultPrevented: event.defaultPrevented,
			}
		})
	}

	// The shortcut handler is installed in a `useEffect`, so it can be a moment
	// after the SSR markup becomes visible. Retry until we observe `preventDefault`.
	let first = await dispatchShortcut()
	for (let i = 0; i < 40 && !first.defaultPrevented; i++) {
		await page.waitForTimeout(50)
		first = await dispatchShortcut()
	}
	expect(first.cancelable).toBe(true)
	expect(first.defaultPrevented).toBe(true)

	await expect(searchInput).toBeVisible()
	await expect(searchInput).toBeFocused()

	const second = await dispatchShortcut()
	expect(second.cancelable).toBe(true)
	expect(second.defaultPrevented).toBe(false)
	await expect(searchInput).toBeFocused()
})
