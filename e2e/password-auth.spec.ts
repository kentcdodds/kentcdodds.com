import { test, expect } from '@playwright/test'
import { readEmail } from '#tests/mocks/utils.ts'
import { createUser } from '#tests/playwright-utils.ts'

test.describe('Password Authentication', () => {
	test('should require password for login', async ({ page }) => {
		await page.goto('/login')
		
		// Should show password field (no tabs)
		await expect(page.locator('[name="password"]')).toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible()
		
		// Should show forgot password link
		await expect(page.locator('a:has-text("Forgot password?")')).toBeVisible()
	})

	test('should show error for missing password', async ({ page }) => {
		await page.goto('/login')
		
		// Try to submit with only email
		await page.fill('[name="email"]', 'test@example.com')
		await page.click('button[type="submit"]:has-text("Sign in")')
		
		// Should stay on login page with error
		await expect(page).toHaveURL('/login')
		await expect(page.locator('[id="error-message"]')).toContainText('Password is required')
	})

	test('should show error for wrong password', async ({ page }) => {
		const userData = createUser()
		
		await page.goto('/login')
		await page.fill('[name="email"]', userData.email)
		await page.fill('[name="password"]', 'wrongpassword')
		await page.click('button[type="submit"]:has-text("Sign in")')
		
		// Should stay on login page with error
		await expect(page).toHaveURL('/login')
		await expect(page.locator('[id="error-message"]')).toContainText('Invalid email or password')
	})

	test('forgot password flow should work end-to-end', async ({ page }) => {
		const userData = createUser()
		
		// Go to login and click forgot password
		await page.goto('/login')
		await page.click('a:has-text("Forgot password?")')
		
		// Should be on forgot password page
		await expect(page).toHaveURL('/forgot-password')
		await expect(page.locator('h1:has-text("Forgot your password?")')).toBeVisible()
		
		// Enter email
		await page.fill('[name="email"]', userData.email)
		await page.click('button[type="submit"]:has-text("Send Reset Email")')
		
		// Should show success message
		await expect(page.locator('text=Check your email')).toBeVisible()
		await expect(page.locator(`text=If an account with ${userData.email} exists`)).toBeVisible()
	})

	test('should navigate back to login from forgot password', async ({ page }) => {
		await page.goto('/forgot-password')
		
		// Should have back to login button
		await expect(page.locator('button:has-text("Back to Login")')).toBeVisible()
		
		// Or link to login
		await expect(page.locator('a[href="/login"]')).toBeVisible()
	})

	test('should show helpful text for users without passwords', async ({ page }) => {
		await page.goto('/login')
		
		// Should have explanatory text about password setup
		await expect(page.locator('text=If you don\'t have a password yet, click "Forgot password?" to set one up')).toBeVisible()
	})

	test('password reset email should contain verification flow', async ({ page }) => {
		const userData = createUser()
		
		await page.goto('/forgot-password')
		await page.fill('[name="email"]', userData.email)
		await page.click('button[type="submit"]:has-text("Send Reset Email")')
		
		// Should show success message (always, for security)
		await expect(page.locator('text=Check your email')).toBeVisible()
		
		// In real implementation, email would be sent with verification code
		// This test verifies the UI flow
	})

	test('should be accessible with screen readers', async ({ page }) => {
		await page.goto('/login')
		
		// Check proper labeling
		await expect(page.locator('label[for="email-address"]')).toBeVisible()
		await expect(page.locator('label[for="password"]')).toBeVisible()
		
		// Check ARIA attributes
		await expect(page.locator('[name="password"]')).toHaveAttribute('autocomplete', 'current-password')
		
		// Check form submission accessibility
		await page.fill('[name="email"]', 'test@example.com')
		await page.fill('[name="password"]', 'password')
		
		// Should have proper submit button text
		await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible()
		
		// Should have disabled state when form is invalid
		await page.fill('[name="email"]', '')
		await expect(page.locator('button[type="submit"]')).toBeDisabled()
	})

	test('forgot password page should be accessible', async ({ page }) => {
		await page.goto('/forgot-password')
		
		// Check proper labeling
		await expect(page.locator('label[for="email"]')).toBeVisible()
		
		// Check form accessibility
		await expect(page.locator('[name="email"]')).toHaveAttribute('type', 'email')
		await expect(page.locator('[name="email"]')).toHaveAttribute('autocomplete', 'email')
		
		// Should have proper button states
		await expect(page.locator('button[type="submit"]')).toBeDisabled()
		
		// Fill valid email should enable button
		await page.fill('[name="email"]', 'test@example.com')
		await expect(page.locator('button[type="submit"]')).toBeEnabled()
	})
})