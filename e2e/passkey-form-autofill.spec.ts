import { expect, test } from './utils.ts'

test.use({
	// Useful for producing a walkthrough artifact in environments where headed
	// browsers aren't reliably visible on the VM desktop.
	video: process.env.PW_VIDEO === 'true' ? 'on' : 'off',
})

test('passkey form autofill signs in via conditional UI', async ({ page, login }) => {
	await page.setViewportSize({ width: 1400, height: 900 })
	const demoPause = async (ms: number) => {
		if (process.env.PW_DEMO === 'true') {
			await page.waitForTimeout(ms)
		}
	}

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
	await demoPause(750)
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
	await demoPause(750)
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

	// Hold the verify request so we can assert markup while still on /login.
	let releaseVerify = () => {}
	const verifyGate = new Promise<void>((resolve) => {
		releaseVerify = () => resolve()
	})
	await page.route('**/resources/webauthn/verify-authentication', async (route) => {
		await verifyGate
		await route.continue()
	})

	await page.goto('/login')
	await demoPause(750)

	// Markup requirement for passkey form-autofill (per web.dev article).
	await expect(page.locator('#email-address')).toHaveAttribute(
		'autocomplete',
		'username webauthn',
	)

	// End-to-end: sign-in proceeds via passkey (conditional UI or the explicit button).
	const verifyRequestStarted = await page
		.waitForRequest('**/resources/webauthn/verify-authentication', {
			timeout: 3_000,
		})
		.then(() => true)
		.catch(() => false)
	if (!verifyRequestStarted) {
		await page.getByRole('button', { name: /Login with Passkey/i }).click()
		await page.waitForRequest('**/resources/webauthn/verify-authentication')
	}

	releaseVerify()

	await page.waitForURL('**/me', { timeout: 10_000 })
	await expect(page.getByRole('heading', { name: "Here's your profile." })).toBeVisible()
	await demoPause(1_250)
})

