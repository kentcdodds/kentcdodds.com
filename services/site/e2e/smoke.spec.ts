import { expect, test } from '@playwright/test'

test('App loads and nav works', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 })
	await page.goto('/')

	const nav = page.getByRole('navigation')

	// Wide viewport: all links visible, and Talks is between Blog and Courses.
	const navLinks = page.locator('.navbar-links [data-nav-item] a')
	await expect(navLinks).toHaveText([
		'Blog',
		'Talks',
		'Courses',
		'Discord',
		'Chats',
		'Calls',
		'About',
	])

	// Narrower desktop viewport: Discord + Chats hide (same behavior as Chats had).
	await page.setViewportSize({ width: 1100, height: 900 })
	await expect(
		page.locator('.navbar-links [data-nav-item="discord"]'),
	).toBeHidden()
	await expect(
		page.locator('.navbar-links [data-nav-item="chats"]'),
	).toBeHidden()

	const blogLink = nav.getByRole('link', { name: 'Blog' })
	await blogLink.click()

	await expect(blogLink).toHaveClass(/underlined/)

	// Expects the URL to contain intro.
	await expect(page).toHaveURL(/.*blog/)
	await expect(
		page.getByRole('heading', { level: 1, name: 'Kent C. Dodds' }),
	).toBeVisible()
})
