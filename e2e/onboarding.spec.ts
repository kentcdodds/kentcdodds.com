import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { deleteUserByEmail, extractUrl, readEmail } from './utils.ts'

test('A new user can create an account', async ({ page }) => {
	const firstName = faker.person.firstName()
	const emailAddress = faker.internet.email({
		firstName,
		lastName: faker.person.lastName(),
		provider: 'example.com',
	})
	const password = faker.internet.password({ length: 16 })
	await page.goto('/')
	await page
		.getByRole('navigation')
		.getByRole('link', { name: 'Login' })
		.click()
	await expect(page).toHaveURL(/.*login/)
	await expect(
		page.getByRole('heading', { level: 2, name: /Log.?in/i }),
	).toBeVisible()

	await page.getByRole('link', { name: /create one/i }).click()
	await expect(page).toHaveURL(/.*signup/)

	// request signup verification code
	const signupMain = page.getByRole('main')
	await signupMain.getByRole('textbox', { name: /email/i }).fill(emailAddress)
	await signupMain.getByRole('button', { name: /email me a code/i }).click()
	await expect(page.getByText(/verification code sent/i)).toBeVisible()

	// read and verify the email
	const email = await readEmail(emailAddress)
	invariant(email, 'Email not found')
	expect(email.to).toBe(emailAddress)
	expect(email.from).toMatch(/team\+kcd@kentcdodds.com/)
	expect(email.subject).toMatch(/verification/i)
	const verifyLink = extractUrl(email.text)
	invariant(verifyLink, 'Verification link not found')
	await page.goto(verifyLink)

	// sign up for an account
	const mainContent = page.getByRole('main')
	await expect(page).toHaveURL(/.*signup/)
	await mainContent.getByRole('textbox', { name: /name/i }).fill(firstName)
	await mainContent.getByRole('radio', { name: /blue/i }).check({ force: true })
	await mainContent.getByLabel(/^password$/i).fill(password)
	await mainContent.getByLabel(/confirm password/i).fill(password)
	await mainContent.getByRole('button', { name: /create account/i }).click()

	await expect(page).toHaveURL(/.*me/)
	await expect(
		page.getByRole('heading', { level: 2, name: /profile/i }),
	).toBeVisible()

	await deleteUserByEmail(emailAddress)

	await page.reload()
	await expect(page).toHaveURL(/.*login/)
})
