import { expect, test, type Page } from '@playwright/test'

// Chromium writes an uncompressed page-tree object, so the page count is
// readable directly from the PDF bytes (`/Count N` on the `/Pages` node).
function getPdfPageCount(pdf: Buffer) {
	const counts = [...pdf.toString('latin1').matchAll(/\/Count (\d+)/g)].map(
		(match) => Number(match[1]),
	)
	if (counts.length === 0) {
		throw new Error('No /Count entry found in PDF')
	}
	return Math.max(...counts)
}

async function printResumeToPdf(page: Page, url: string) {
	await page.goto(url)
	await expect(page.locator('main.resume-main')).toBeVisible()
	await page.evaluate(() => document.fonts.ready)
	return page.pdf({ preferCSSPageSize: true })
}

test('short resume prints to a single page', async ({ page }) => {
	const pdf = await printResumeToPdf(page, '/resume?view=short')
	expect(getPdfPageCount(pdf)).toBe(1)
})

test('full resume prints without trailing blank pages', async ({ page }) => {
	const pdf = await printResumeToPdf(page, '/resume')
	// The full resume content currently fills two pages. Hidden site chrome
	// (navbar/footer) used to add blank trailing pages beyond the content; if
	// this assertion fails, check the printout for blank pages before bumping
	// the expected count.
	expect(getPdfPageCount(pdf)).toBe(2)
})

test('resume print uses light colors when the page is in dark mode', async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: 'dark' })
	await page.goto('/resume')
	await expect(page.locator('main.resume-main')).toBeVisible()
	await page.evaluate(() => document.documentElement.classList.add('dark'))
	await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
	await page.evaluate(() => {
		for (const animation of document.getAnimations()) {
			animation.finish()
		}
	})

	const colors = await page.evaluate(() => {
		const pageEl = document.querySelector('.resume-page')
		const mainEl = document.querySelector('main.resume-main')
		const locationEl = document.querySelector('.resume-location')
		if (!pageEl || !mainEl || !locationEl) {
			throw new Error('Resume print elements were not found')
		}
		const htmlStyle = getComputedStyle(document.documentElement)
		const bodyStyle = getComputedStyle(document.body)
		const pageStyle = getComputedStyle(pageEl)
		const mainStyle = getComputedStyle(mainEl)
		const locationStyle = getComputedStyle(locationEl)
		return {
			htmlBackground: htmlStyle.backgroundColor,
			bodyBackground: bodyStyle.backgroundColor,
			pageColor: pageStyle.color,
			pageBackground: pageStyle.backgroundColor,
			mainColor: mainStyle.color,
			locationColor: locationStyle.color,
		}
	})

	expect(colors.htmlBackground).toBe('rgb(255, 255, 255)')
	expect(colors.bodyBackground).toBe('rgb(255, 255, 255)')
	expect(colors.pageBackground).toBe('rgb(255, 255, 255)')
	expect(colors.mainColor).toBe('rgb(0, 0, 0)')
	expect(colors.locationColor).toBe('rgb(85, 85, 85)')
})
