import { expect, test } from './utils.ts'

test('passkey form autofill signs in via conditional UI', async ({ page, login }) => {
	await page.setViewportSize({ width: 1400, height: 900 })

	// Configure a virtual authenticator that automatically simulates user presence.
	// This makes WebAuthn ceremonies deterministic in automation (no OS dialog / no
	// manual "touch security key" steps).
	const client = await page.context().newCDPSession(page)
	await client.send('WebAuthn.enable', { enableUI: false })
	await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	})

	// Seed a signed-in user (no UI signup needed).
	await login()

	// Register a passkey for the signed-in user.
	await page.goto('/me/passkeys')
	await page.getByRole('button', { name: 'Add Passkey' }).click()
	await expect(page.getByText(/Passkey/)).toBeVisible()

	// Sign out (clear cookies) and load the login page.
	await page.context().clearCookies()
	await page.goto('/login')

	// Ensure we don't immediately redirect (conditional UI should wait for user intent).
	await page.waitForTimeout(250)
	await expect(page).toHaveURL(/\/login$/)

	// Focusing the username/email field should resolve the pending conditional
	// WebAuthn request and complete login.
	const verifyResponsePromise = page.waitForResponse((resp) => {
		return (
			resp.url().includes('/resources/webauthn/verify-authentication') &&
			resp.request().method() === 'POST'
		)
	})
	await page.getByLabel('Email address').click()
	await verifyResponsePromise

	await page.waitForURL('**/me', { timeout: 10_000 })
	await expect(page.getByRole('heading', { name: "Here's your profile." })).toBeVisible()
})

