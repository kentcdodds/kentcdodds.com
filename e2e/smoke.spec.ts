import { expect, test } from '@playwright/test'

test('App loads and nav works', async ({ page }) => {
	await page.goto('/')

	const nav = page.getByRole('navigation')
	await expect(nav).toBeVisible()
	const blogLink = nav.getByRole('link', { name: 'Blog' })
	await blogLink.click()

	// In SPA navigation, clicking the link doesn't necessarily trigger a full
	// "document navigation", so wait on URL + page-specific content instead.
	await expect(page).toHaveURL(/\/blog(\/|$)/, { timeout: 15_000 })
	await expect(blogLink).toHaveClass(/active/)
	await expect(page.getByPlaceholder(/Search posts/i)).toBeVisible()
})
