import { expect, test } from '@playwright/test'

test('App loads and nav works', async ({ page }) => {
	await page.goto('/')

	const nav = page.getByRole('navigation')
	const blogLink = nav.getByRole('link', { name: 'Blog' })
	await blogLink.click()

	await expect(blogLink).toHaveClass(/underlined/)

	// Expects the URL to contain intro.
	await expect(page).toHaveURL(/.*blog/)
	await expect(
		page.getByRole('heading', { level: 1, name: 'Kent C. Dodds' }),
	).toBeVisible()
})

test('ctrl/cmd+shift+p opens nav search and focuses it', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('navigation')).toBeVisible()

	await page.evaluate(() => {
		;(window as any).__navSearchShortcutEvents = []
		window.addEventListener(
			'keydown',
			(event) => {
				const isModifierPressed = event.metaKey || event.ctrlKey
				const isPKey =
					event.code === 'KeyP' || event.key.toLowerCase() === 'p'
				if (!isModifierPressed || !event.shiftKey || !isPKey) return

				// Capture listener runs before the app handler; queue a microtask so
				// we can observe whether the app called `preventDefault()`.
				queueMicrotask(() => {
					;(window as any).__navSearchShortcutEvents.push({
						defaultPrevented: event.defaultPrevented,
					})
				})
			},
			{ capture: true },
		)
	})

	await page.keyboard.press('Control+Shift+P')
	const searchInput = page.getByPlaceholder('Semantic search...')
	await expect(searchInput).toBeVisible()
	await expect(searchInput).toBeFocused()

	await page.waitForFunction(
		() => (window as any).__navSearchShortcutEvents?.length >= 1,
	)

	await page.keyboard.press('Control+Shift+P')
	await expect(searchInput).toBeFocused()

	await page.waitForFunction(
		() => (window as any).__navSearchShortcutEvents?.length >= 2,
	)

	const events = await page.evaluate(
		() => (window as any).__navSearchShortcutEvents,
	)
	expect(events[0]?.defaultPrevented).toBe(true)
	expect(events[1]?.defaultPrevented).toBe(false)
})
