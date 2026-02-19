import { faker } from '@faker-js/faker'
import invariant from 'tiny-invariant'
import { expect, readEmail, test } from './utils.ts'

test('Call Kent recording flow', async ({ page, login }) => {
	// This flow does real audio stitching (ffmpeg) + mocked publishing + email
	// fixture writes, which can be slow on CI.
	test.setTimeout(180_000)
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

	const startRecordingButton = mainContent.getByRole('button', {
		name: /start recording/i,
	})
	await expect(startRecordingButton).toBeVisible({ timeout: 15_000 })
	await startRecordingButton.click()

	const stopButton = mainContent.getByRole('button', { name: /stop/i })
	const pauseButton = mainContent.getByRole('button', { name: /pause/i })
	const resumeButton = mainContent.getByRole('button', { name: /resume/i })
	const rerecordButton = mainContent.getByRole('button', { name: /re-record/i })
	const acceptButton = mainContent.getByRole('button', { name: /accept/i })

	await expect(stopButton).toBeVisible({ timeout: 15_000 })
	await page.waitForTimeout(250) // let the sample.wav file record a bit
	await pauseButton.click()
	await expect(resumeButton).toBeVisible()
	await resumeButton.click()
	await expect(pauseButton).toBeVisible()
	await page.waitForTimeout(250) // record a bit more
	await stopButton.click()
	await expect(rerecordButton).toBeVisible()
	await rerecordButton.click()

	// Second recording: keep it simple (record a bit, then accept).
	await expect(startRecordingButton).toBeVisible({ timeout: 15_000 })
	await startRecordingButton.click()
	await expect(stopButton).toBeVisible({ timeout: 15_000 })
	await page.waitForTimeout(750) // record a bit more to avoid empty blobs
	await stopButton.click()

	await expect(acceptButton).toBeVisible({ timeout: 15_000 })
	await acceptButton.click()

	const titleInput = mainContent.getByRole('textbox', { name: /title/i })
	await expect(titleInput).toBeVisible({ timeout: 15_000 })
	await titleInput.fill(title)
	await mainContent
		.getByRole('textbox', { name: /description/i })
		.fill(faker.lorem.paragraph())
	await mainContent
		.getByRole('textbox', { name: /keywords/i })
		.fill(faker.lorem.words(3).split(' ').join(','))
	await mainContent.getByRole('button', { name: /submit/i }).click()

	// Wait for the redirect to confirm the call was created
	await expect(page).toHaveURL(/.*calls\/record\/[a-z0-9-]+/, {
		timeout: 10_000,
	})

	await login({ role: 'ADMIN' })
	await page.goto('/calls/admin')

	const callLink = page.getByRole('link', { name: new RegExp(title, 'i') })
	await expect(callLink).toBeVisible({ timeout: 10_000 })
	await callLink.click()

	const adminStartButton = page.getByRole('button', { name: /start recording/i })
	const adminStopButton = page.getByRole('button', { name: /stop/i })
	await expect(adminStartButton).toBeVisible({ timeout: 15_000 })
	await adminStartButton.click()
	await expect(adminStopButton).toBeVisible({ timeout: 15_000 })
	await page.waitForTimeout(750) // record a bit more to avoid empty blobs
	await adminStopButton.click()

	const adminAcceptButton = page.getByRole('button', { name: /accept/i })
	await expect(adminAcceptButton).toBeVisible({ timeout: 15_000 })
	await adminAcceptButton.click()
	await page.getByRole('button', { name: /submit/i }).click()
	await expect(page).toHaveURL(/\/calls(?!\/admin)(\/|$)/, { timeout: 60_000 })

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
