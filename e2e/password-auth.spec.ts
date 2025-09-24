import { test, expect } from '@playwright/test'
import { readEmail } from '#tests/mocks/utils.ts'
import { createUser } from '#tests/playwright-utils.ts'

test.describe('Password Authentication - Tabbed Interface', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login')
	})

	test('should display three tabs: Sign In, Sign Up, and Forgot Password', async ({ page }) => {
		await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
		await expect(page.locator('button:has-text("Sign Up")')).toBeVisible()
		await expect(page.locator('button:has-text("Forgot Password")')).toBeVisible()
	})

	test('should default to Sign In tab', async ({ page }) => {
		// Sign In tab should be active by default
		await expect(page.locator('button:has-text("Sign In")').first()).toHaveClass(/border-blue-500/)
		await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
	})

	test('should switch between tabs and show appropriate forms', async ({ page }) => {
		// Sign In tab (default)
		await expect(page.locator('[name="email"]')).toBeVisible()
		await expect(page.locator('[name="password"]')).toBeVisible()
		await expect(page.locator('[name="firstName"]')).not.toBeVisible()

		// Switch to Sign Up tab
		await page.locator('button:has-text("Sign Up")').first().click()
		await expect(page.locator('[name="email"]')).toBeVisible()
		await expect(page.locator('[name="firstName"]')).toBeVisible()
		await expect(page.locator('[name="lastName"]')).toBeVisible()
		await expect(page.locator('[name="password"]')).toBeVisible()
		await expect(page.locator('[name="confirmPassword"]')).toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible()

		// Switch to Forgot Password tab
		await page.locator('button:has-text("Forgot Password")').first().click()
		await expect(page.locator('[name="email"]')).toBeVisible()
		await expect(page.locator('[name="password"]')).not.toBeVisible()
		await expect(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeVisible()
	})

	test('should validate sign in form', async ({ page }) => {
		// Submit button should be disabled without valid inputs
		await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeDisabled()

		// Fill in email
		await page.fill('[name="email"]', 'test@example.com')
		await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeDisabled()

		// Fill in password
		await page.fill('[name="password"]', 'password123')
		await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeEnabled()
	})

	test('should show error for missing password in sign in', async ({ page }) => {
		await page.fill('[name="email"]', 'test@example.com')
		await page.locator('button[type="submit"]:has-text("Sign In")').click()
		
		await expect(page).toHaveURL('/login')
		await expect(page.locator('[id="error-message"]')).toContainText('Password is required')
	})

	test('should show error for wrong password', async ({ page }) => {
		const userData = createUser()
		
		await page.fill('[name="email"]', userData.email)
		await page.fill('[name="password"]', 'wrongpassword')
		await page.locator('button[type="submit"]:has-text("Sign In")').click()
		
		await expect(page).toHaveURL('/login')
		await expect(page.locator('[id="error-message"]')).toContainText('Invalid email or password')
	})

	test('should validate sign up form', async ({ page }) => {
		await page.locator('button:has-text("Sign Up")').first().click()

		// Submit button should be disabled without valid inputs
		await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeDisabled()

		// Fill in required fields
		await page.fill('[name="email"]', 'test@example.com')
		await page.fill('[name="firstName"]', 'John')
		await page.fill('[name="password"]', 'Password123!')
		await page.fill('[name="confirmPassword"]', 'Password123!')

		await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeEnabled()
	})

	test('should show password mismatch error', async ({ page }) => {
		await page.locator('button:has-text("Sign Up")').first().click()

		await page.fill('[name="password"]', 'password1')
		await page.fill('[name="confirmPassword"]', 'password2')

		await expect(page.locator('text=Passwords do not match')).toBeVisible()
	})

	test('should validate forgot password form', async ({ page }) => {
		await page.locator('button:has-text("Forgot Password")').first().click()

		// Submit button should be disabled without email
		await expect(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeDisabled()

		// Fill in email
		await page.fill('[name="email"]', 'test@example.com')
		await expect(page.locator('button[type="submit"]:has-text("Send Reset Email")')).toBeEnabled()
	})

	test('should handle forgot password submission', async ({ page }) => {
		await page.locator('button:has-text("Forgot Password")').first().click()

		await page.fill('[name="email"]', 'test@example.com')
		await page.locator('button[type="submit"]:has-text("Send Reset Email")').click()

		await expect(page.locator('text=Check your email')).toBeVisible()
		await expect(page.locator('text=If an account with test@example.com exists')).toBeVisible()
	})

	test('should show passkey login option', async ({ page }) => {
		await expect(page.locator('button:has-text("Login with Passkey")')).toBeVisible()
	})

	test('should handle form reset', async ({ page }) => {
		await page.fill('[name="email"]', 'test@example.com')
		await page.fill('[name="password"]', 'password123')

		await page.locator('button:has-text("Reset")').click()

		await expect(page.locator('[name="email"]')).toHaveValue('')
		await expect(page.locator('[name="password"]')).toHaveValue('')
	})

	test('should be accessible with proper ARIA labels', async ({ page }) => {
		// Check tab accessibility
		await expect(page.locator('nav[aria-label="Tabs"]')).toBeVisible()
		
		// Check form labels
		await expect(page.locator('label[for="email-address"]')).toBeVisible()
		await expect(page.locator('label[for="password"]')).toBeVisible()
		
		// Test keyboard navigation between tabs
		await page.locator('button:has-text("Sign In")').first().focus()
		await page.keyboard.press('ArrowRight')
		await expect(page.locator('button:has-text("Sign Up")').first()).toBeFocused()
	})

	test('should maintain context-appropriate descriptions', async ({ page }) => {
		// Sign In tab
		await expect(page.locator('text=To sign in to your account, enter your email and password above')).toBeVisible()
		
		// Sign Up tab
		await page.locator('button:has-text("Sign Up")').first().click()
		await expect(page.locator('text=Create a new account by filling out the form above')).toBeVisible()
		
		// Forgot Password tab
		await page.locator('button:has-text("Forgot Password")').first().click()
		await expect(page.locator('text=Enter your email address and we\'ll send you instructions to reset your password')).toBeVisible()
	})

	test('should have proper intent values for different forms', async ({ page }) => {
		// Sign In intent
		await expect(page.locator('input[name="intent"][value="signin"]')).toBeVisible()
		
		// Sign Up intent
		await page.locator('button:has-text("Sign Up")').first().click()
		await expect(page.locator('input[name="intent"][value="signup"]')).toBeVisible()
		
		// Forgot Password intent
		await page.locator('button:has-text("Forgot Password")').first().click()
		await expect(page.locator('input[name="intent"][value="forgot-password"]')).toBeVisible()
	})
})