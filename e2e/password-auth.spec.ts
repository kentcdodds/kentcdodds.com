import { test, expect } from '@playwright/test'
import { readEmail } from '#tests/mocks/utils.ts'
import { createUser } from '#tests/playwright-utils.ts'

test.describe('Password Authentication', () => {
	test('should allow login with email and password', async ({ page }) => {
		// Create a test user with password
		const userData = createUser()
		const password = 'TestPassword123!'
		
		// First visit signup to create account with password
		await page.goto('/signup')
		await page.fill('[name="email"]', userData.email)
		await page.click('button[type="submit"]')
		
		// Get verification code from email
		const email = await readEmail(userData.email)
		expect(email).toBeTruthy()
		const codeMatch = email.text.match(/verification code: (\d{6})/)
		expect(codeMatch).toBeTruthy()
		const verificationCode = codeMatch![1]
		
		// Enter verification code
		await page.fill('[name="code"]', verificationCode)
		await page.click('button[type="submit"]')
		
		// Complete onboarding with password
		await page.fill('[name="username"]', userData.username)
		await page.fill('[name="name"]', userData.name)
		await page.fill('[name="password"]', password)
		await page.fill('[name="confirmPassword"]', password)
		await page.click('button[type="submit"]')
		
		// Should be logged in and redirected to /me
		await expect(page).toHaveURL('/me')
		
		// Now log out and test login flow
		await page.goto('/logout')
		await page.goto('/login')
		
		// Should default to password tab
		await expect(page.locator('button:has-text("Password")')).toHaveClass(/border-blue-500/)
		
		// Fill in email and password
		await page.fill('[name="email"]', userData.email)
		await page.fill('[name="password"]', password)
		await page.click('button[type="submit"]:has-text("Sign in")')
		
		// Should be logged in and redirected
		await expect(page).toHaveURL('/me')
	})

	test('should show error for wrong password', async ({ page }) => {
		const userData = createUser()
		
		await page.goto('/login')
		await page.fill('[name="email"]', userData.email)
		await page.fill('[name="password"]', 'wrongpassword')
		await page.click('button[type="submit"]:has-text("Sign in")')
		
		// Should stay on login page with error
		await expect(page).toHaveURL('/login')
		await expect(page.locator('[id="error-message"]')).toBeVisible()
	})

	test('should allow toggle between password and magic link modes', async ({ page }) => {
		await page.goto('/login')
		
		// Should default to password mode
		await expect(page.locator('button:has-text("Password")')).toHaveClass(/border-blue-500/)
		await expect(page.locator('[name="password"]')).toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible()
		
		// Switch to magic link mode
		await page.click('button:has-text("Magic Link")')
		await expect(page.locator('button:has-text("Magic Link")')).toHaveClass(/border-blue-500/)
		await expect(page.locator('[name="password"]')).not.toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Email a login link")')).toBeVisible()
		
		// Switch back to password mode
		await page.click('button:has-text("Password")')
		await expect(page.locator('button:has-text("Password")')).toHaveClass(/border-blue-500/)
		await expect(page.locator('[name="password"]')).toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible()
	})

	test('should show forgot password link and navigate to reset', async ({ page }) => {
		await page.goto('/login')
		
		// Should see forgot password link in password mode
		await expect(page.locator('a:has-text("Forgot password?")')).toBeVisible()
		
		// Click forgot password should navigate to reset page
		await page.click('a:has-text("Forgot password?")')
		await expect(page).toHaveURL('/reset-password')
	})

	test('password reset flow should work end-to-end', async ({ page }) => {
		const userData = createUser()
		const newPassword = 'NewPassword123!'
		
		// Go to password reset
		await page.goto('/reset-password')
		
		// Enter email
		await page.fill('[name="email"]', userData.email)
		await page.click('button[type="submit"]')
		
		// Get verification code from email
		const email = await readEmail(userData.email)
		expect(email).toBeTruthy()
		const codeMatch = email.text.match(/verification code: (\d{6})/)
		expect(codeMatch).toBeTruthy()
		const verificationCode = codeMatch![1]
		
		// Enter verification code
		await page.fill('[name="code"]', verificationCode)
		await page.click('button[type="submit"]')
		
		// Should be redirected to reset password form
		await expect(page).toHaveURL('/reset-password')
		
		// Enter new password
		await page.fill('[name="password"]', newPassword)
		await page.fill('[name="confirmPassword"]', newPassword)
		await page.click('button[type="submit"]')
		
		// Should be redirected to login
		await expect(page).toHaveURL('/login')
		
		// Should be able to login with new password
		await page.fill('[name="email"]', userData.email)
		await page.fill('[name="password"]', newPassword)
		await page.click('button[type="submit"]:has-text("Sign in")')
		
		await expect(page).toHaveURL('/me')
	})

	test('should handle onboarding flow for existing users without passwords', async ({ page }) => {
		const userData = createUser()
		
		// Visit onboarding directly (simulating redirect from magic link)
		await page.goto('/onboarding')
		
		// Should see password setup form
		await expect(page.locator('h1:has-text("Set up your password")')).toBeVisible()
		
		// Fill in password
		const password = 'TestPassword123!'
		await page.fill('[name="password"]', password)
		await page.fill('[name="confirmPassword"]', password)
		await page.click('button[type="submit"]')
		
		// Should be redirected to /me
		await expect(page).toHaveURL('/me')
	})

	test('should validate password strength', async ({ page }) => {
		await page.goto('/reset-password')
		
		const userData = createUser()
		await page.fill('[name="email"]', userData.email)
		await page.click('button[type="submit"]')
		
		// Get verification code
		const email = await readEmail(userData.email)
		const codeMatch = email.text.match(/verification code: (\d{6})/)
		const verificationCode = codeMatch![1]
		
		await page.fill('[name="code"]', verificationCode)
		await page.click('button[type="submit"]')
		
		// Try weak password
		await page.fill('[name="password"]', 'weak')
		await page.fill('[name="confirmPassword"]', 'weak')
		await page.click('button[type="submit"]')
		
		// Should show validation error
		await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
		
		// Try password without required characters
		await page.fill('[name="password"]', 'onlylowercase')
		await page.fill('[name="confirmPassword"]', 'onlylowercase')
		await page.click('button[type="submit"]')
		
		await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible()
	})

	test('should be accessible with screen readers', async ({ page }) => {
		await page.goto('/login')
		
		// Check proper labeling
		await expect(page.locator('label[for="email-address"]')).toBeVisible()
		await expect(page.locator('label[for="password"]')).toBeVisible()
		
		// Check ARIA attributes
		await expect(page.locator('[name="email"]')).toHaveAttribute('aria-describedby')
		await expect(page.locator('[name="password"]')).toHaveAttribute('autocomplete', 'current-password')
		
		// Check form submission accessibility
		await page.fill('[name="email"]', 'test@example.com')
		await page.fill('[name="password"]', 'password')
		
		// Should have proper submit button text
		await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible()
	})
})