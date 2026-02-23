import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { expect, readEmail, test } from './utils.ts'

test('Call Kent recording flow', async ({ page, login }) => {
	test.setTimeout(120_000)
	const user = await login()
	await page.goto('/calls')

	const title = faker.lorem.words(2)
	await page
		.getByRole('banner')
		.getByRole('link', { name: /record/i })
		.click()
	await expect(page).toHaveURL(/.*record/)
	await expect(
		page.getByRole('heading', { level: 2, name: /record your call/i }),
	).toBeVisible()

	const mainContent = page.getByRole('main')
	await mainContent.getByRole('link', { name: /new recording/i }).click()
	await mainContent.getByRole('button', { name: /current.*device/i }).click()

	await mainContent
		.getByRole('checkbox', { name: /default/i })
		.click({ force: true })
	await mainContent.getByRole('button', { name: /start/i }).click()
	await page.waitForTimeout(50) // let the sample.wav file play for a bit
	await mainContent.getByRole('button', { name: /pause/i }).click()
	await mainContent.getByRole('button', { name: /resume/i }).click()
	await page.waitForTimeout(50) // let the sample.wav file play for a bit more
	await mainContent.getByRole('button', { name: /stop/i }).click()
	await mainContent.getByRole('button', { name: /re-record/i }).click()

	await mainContent.getByRole('button', { name: /start/i }).click()
	await page.waitForTimeout(500) // let the sample.wav file play for a bit more
	await mainContent.getByRole('button', { name: /stop/i }).click()

	await mainContent.getByRole('button', { name: /accept/i }).click()
	await mainContent.getByRole('textbox', { name: /title/i }).type(title)
	await mainContent
		.getByRole('textbox', { name: /notes/i })
		.type(faker.lorem.paragraph())
	await mainContent.getByRole('button', { name: /submit/i }).click()

	// Wait for the redirect to confirm the call was created
	// NOTE: `/calls/record/new` is a thing, so we specifically wait for a UUID.
	await expect(page).toHaveURL(
		/.*calls\/record\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
		{
			timeout: 10_000,
		},
	)
	const callIdMatch = page
		.url()
		.match(
			/calls\/record\/(?<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
		)
	const callId = callIdMatch?.groups?.id
	invariant(callId, 'Call id not found in URL after recording submission')

	await login({ role: 'ADMIN' })
	// Navigate directly to avoid flakiness from list ordering / other calls.
	await page.goto(`/calls/admin/${callId}`)

	await page.getByRole('button', { name: /start/i }).click()
	await page.waitForTimeout(500) // let the sample.wav file play for a bit more
	await page.getByRole('button', { name: /stop/i }).click()

	await page.getByRole('button', { name: /accept/i }).click()
	await page.getByRole('button', { name: /generate episode draft/i }).click()

	// Wait for draft processing to finish and editor to appear.
	await expect(page.getByLabel(/episode title/i)).toBeVisible({
		timeout: 60_000,
	})

	// Publish requires a double-confirmation click.
	await page.getByRole('button', { name: /^publish episode$/i }).click()
	await page.getByRole('button', { name: /publish \(sure\?\)/i }).click()
	await expect(page).toHaveURL(/.*\/calls(\/|$)/)

	// processing the audio takes a while, so let the timeout run
	await expect(
		page
			.getByRole('banner')
			.getByRole('heading', { level: 2, name: /calls with kent/i }),
	).toBeVisible({ timeout: 10_000 })

	// Email sending is async and may take time to be written to the mock fixture
	const email = await readEmail((em) => em.to.includes(user.email), {
		maxRetries: 10,
		retryDelay: 500,
	})
	invariant(email, 'Notification email not found')
	expect(email.subject).toMatch(/published/i)
	// NOTE: domain is hard coded for image generation and stuff
	expect(email.text).toContain('https://kentcdodds.com/calls')
})
