import { expect, test } from './utils.ts'

test('passkey form autofill signs in via conditional UI', async ({ page, login }) => {
	await page.setViewportSize({ width: 1400, height: 900 })

	// Configure a virtual authenticator that automatically simulates user presence.
	// This makes WebAuthn ceremonies deterministic in automation (no OS dialog / no
	// manual "touch security key" steps).
	const client = await page.context().newCDPSession(page)
	await client.send('WebAuthn.enable', { enableUI: false })
	const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	})
	await client.send('WebAuthn.setAutomaticPresenceSimulation', {
		authenticatorId,
		enabled: true,
	})
	await client.send('WebAuthn.setUserVerified', {
		authenticatorId,
		isUserVerified: true,
	})

	// Seed a signed-in user (no UI signup needed).
	await login()

	// Register a passkey for the signed-in user.
	await page.goto('/me/passkeys')
	const regOptionsResponsePromise = page.waitForResponse((resp) => {
		return (
			resp.url().includes('/resources/webauthn/generate-registration-options') &&
			resp.request().method() === 'GET'
		)
	})
	await page.getByRole('button', { name: 'Add Passkey' }).click()
	const regOptionsJson = (await regOptionsResponsePromise.then((r) =>
		r.json(),
	)) as {
		options?: { authenticatorSelection?: { residentKey?: string } }
	}
	expect(regOptionsJson.options?.authenticatorSelection?.residentKey).toBe(
		'required',
	)
	await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible({
		timeout: 15_000,
	})
	let { credentials } = await client.send('WebAuthn.getCredentials', {
		authenticatorId,
	})
	expect(credentials.length).toBeGreaterThan(0)
	if (!credentials.some((c) => c.isResidentCredential)) {
		// Playwright's Chromium/Headless Shell can store new credentials as
		// non-resident even when the RP requests `residentKey: 'required'`.
		// Re-add the created credential as resident so the login ceremony can
		// proceed (this matches real-user behavior we expect in actual browsers).
		const [firstCredential] = credentials
		if (!firstCredential) {
			throw new Error('Expected at least one WebAuthn credential')
		}
		await client.send('WebAuthn.removeCredential', {
			authenticatorId,
			credentialId: firstCredential.credentialId,
		})
		await client.send('WebAuthn.addCredential', {
			authenticatorId,
			credential: {
				...firstCredential,
				isResidentCredential: true,
				rpId: firstCredential.rpId ?? 'localhost',
			},
		})
		;({ credentials } = await client.send('WebAuthn.getCredentials', {
			authenticatorId,
		}))
	}
	expect(credentials.some((c) => c.isResidentCredential)).toBe(true)

	// Sign out (clear cookies) and load the login page.
	await page.context().clearCookies()
	await page.goto('/login')

	// Ensure we don't immediately redirect (conditional UI should wait for user intent).
	await page.waitForTimeout(250)
	await expect(page).toHaveURL(/\/login$/)

	// Markup requirement for passkey form-autofill (per web.dev article).
	await expect(page.locator('#email-address')).toHaveAttribute(
		'autocomplete',
		'username webauthn',
	)

	// End-to-end: passkey sign-in succeeds (privacy-friendly: no email needed).
	const verifyResponsePromise = page.waitForResponse((resp) => {
		return (
			resp.url().includes('/resources/webauthn/verify-authentication') &&
			resp.request().method() === 'POST'
		)
	})
	await page.getByRole('button', { name: /Login with Passkey/i }).click()
	await verifyResponsePromise

	await page.waitForURL('**/me', { timeout: 10_000 })
	await expect(page.getByRole('heading', { name: "Here's your profile." })).toBeVisible()
})

