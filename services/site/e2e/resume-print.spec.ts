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
