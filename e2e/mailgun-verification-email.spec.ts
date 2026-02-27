import { faker } from '@faker-js/faker'
import { expect, insertNewUser, readEmail, test } from './utils.ts'

test('password-reset flow can read verification email from mock mailgun', async ({
	page,
}) => {
	const emailAddress = faker.internet
		.email({
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			provider: 'example.com',
		})
		.toLowerCase()
	await insertNewUser({ email: emailAddress })

	await page.goto('/forgot-password')
	const main = page.getByRole('main')
	await main.getByRole('textbox', { name: /email/i }).fill(emailAddress)
	await main.getByRole('button', { name: /email me a reset code/i }).click()

	await expect(page).toHaveURL(/\/reset-password/)
	await expect(
		page.getByText(/if an account exists for that email/i),
	).toBeVisible()

	const resetEmail = await readEmail((email) => {
		return email.to === emailAddress && /reset your password/i.test(email.subject)
	})
	expect(resetEmail).not.toBeNull()
	expect(resetEmail?.verificationCode).toMatch(/[A-Za-z0-9-]+/)
	expect(resetEmail?.verificationUrl).toMatch(/\/reset-password\?verification=/)
})
