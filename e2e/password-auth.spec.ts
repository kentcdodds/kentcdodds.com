import { test, expect } from '@playwright/test'

test.describe('Password Authentication', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to login page
		await page.goto('/login')
	})

	test('should show password and magic link toggle options', async ({ page }) => {
		// Check that both password and magic link options are available
		await expect(page.getByText('Password')).toBeVisible()
		await expect(page.getByText('Magic Link')).toBeVisible()
		
		// Password mode should be selected by default
		await expect(page.getByRole('button', { name: 'Password' })).toHaveClass(/primary/)
	})

	test('should toggle between password and magic link modes', async ({ page }) => {
		// Start in password mode
		await expect(page.getByLabelText('Password')).toBeVisible()
		
		// Switch to magic link mode
		await page.getByRole('button', { name: 'Magic Link' }).click()
		await expect(page.getByLabelText('Password')).not.toBeVisible()
		await expect(page.getByRole('button', { name: 'Email a login link' })).toBeVisible()
		
		// Switch back to password mode
		await page.getByRole('button', { name: 'Password' }).click()
		await expect(page.getByLabelText('Password')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
	})

	test('should validate required fields in password mode', async ({ page }) => {
		// Try to submit without email
		await page.getByRole('button', { name: 'Sign in' }).click()
		
		// Should not be able to submit (button should be disabled)
		await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled()
		
		// Add email, still missing password
		await page.getByLabelText('Email address').fill('test@example.com')
		await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled()
		
		// Add password
		await page.getByLabelText('Password').fill('Password123!')
		await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
	})

	test('should show forgot password option in password mode', async ({ page }) => {
		await page.getByLabelText('Email address').fill('test@example.com')
		await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
		
		// Forgot password button should be disabled without email
		await page.getByLabelText('Email address').clear()
		await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeDisabled()
	})

	test('should show onboarding help section', async ({ page }) => {
		await expect(page.getByText('New to passwords?')).toBeVisible()
		await expect(page.getByText('We\'re transitioning from magic links to passwords')).toBeVisible()
		await expect(page.getByRole('link', { name: 'Click here for help setting up your password' })).toBeVisible()
	})

	test('should navigate to onboarding page', async ({ page }) => {
		await page.getByRole('link', { name: 'Click here for help setting up your password' }).click()
		await expect(page).toHaveURL('/onboarding')
	})
})

test.describe('Password Reset Flow', () => {
	test('should navigate to reset password page with verification', async ({ page }) => {
		// Mock a verification URL (in real scenario, this would come from email)
		const verificationParams = new URLSearchParams({
			code: '123456',
			type: 'reset-password',
			target: 'test@example.com',
		})
		
		await page.goto(`/verify?${verificationParams}`)
		
		// Should redirect to reset password page after verification
		await expect(page).toHaveURL('/reset-password')
	})

	test('should show password requirements on reset page', async ({ page }) => {
		// Navigate directly to reset password (would normally require verification)
		await page.goto('/reset-password')
		
		await expect(page.getByText('Password Requirements')).toBeVisible()
		await expect(page.getByText('At least 6 characters long')).toBeVisible()
		await expect(page.getByText('Contains at least one uppercase letter')).toBeVisible()
		await expect(page.getByText('Contains at least one lowercase letter')).toBeVisible()
		await expect(page.getByText('Contains at least one number')).toBeVisible()
		await expect(page.getByText('Contains at least one special character')).toBeVisible()
	})

	test('should validate password requirements', async ({ page }) => {
		await page.goto('/reset-password')
		
		// Test weak password
		await page.getByLabelText('New Password').fill('weak')
		await page.getByLabelText('Confirm Password').fill('weak')
		
		// Should show validation errors
		await expect(page.getByText('Password must be at least 6 characters')).toBeVisible()
		
		// Test strong password
		await page.getByLabelText('New Password').fill('StrongPass123!')
		await page.getByLabelText('Confirm Password').fill('StrongPass123!')
		
		await expect(page.getByRole('button', { name: 'Reset Password' })).toBeEnabled()
	})

	test('should validate password confirmation match', async ({ page }) => {
		await page.goto('/reset-password')
		
		await page.getByLabelText('New Password').fill('StrongPass123!')
		await page.getByLabelText('Confirm Password').fill('DifferentPass123!')
		
		await expect(page.getByText('Passwords do not match')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Reset Password' })).toBeDisabled()
	})
})

test.describe('Onboarding Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/onboarding')
	})

	test('should explain the change from magic links to passwords', async ({ page }) => {
		await expect(page.getByText('Set up your password')).toBeVisible()
		await expect(page.getByText('We\'re moving from magic links to passwords for better reliability')).toBeVisible()
		await expect(page.getByText('What\'s changing?')).toBeVisible()
	})

	test('should show benefits of the change', async ({ page }) => {
		await expect(page.getByText('Set up a password if you\'re an existing user')).toBeVisible()
		await expect(page.getByText('Create a new account if you\'re new')).toBeVisible()
	})

	test('should validate email input', async ({ page }) => {
		// Button should be disabled initially
		await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
		
		// Invalid email
		await page.getByLabelText('Email Address').fill('invalid-email')
		await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
		
		// Valid email
		await page.getByLabelText('Email Address').fill('test@example.com')
		await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
	})

	test('should show link to login page for users with passwords', async ({ page }) => {
		await expect(page.getByText('Already have a password?')).toBeVisible()
		await expect(page.getByRole('link', { name: 'go directly to the login page' })).toBeVisible()
	})
})

test.describe('Signup with Password', () => {
	test('should support password creation for new users', async ({ page }) => {
		// Mock arriving from verification (onboarding flow)
		const signupParams = new URLSearchParams({
			verified: 'true',
			type: 'onboarding',
			email: 'newuser@example.com',
		})
		
		await page.goto(`/signup?${signupParams}`)
		
		// Should show password fields for new users
		await expect(page.getByLabelText('Password')).toBeVisible()
		await expect(page.getByLabelText('Confirm Password')).toBeVisible()
		await expect(page.getByText('Password Requirements')).toBeVisible()
	})

	test('should validate all signup fields including password', async ({ page }) => {
		await page.goto('/signup')
		
		// Fill in team selection (required)
		await page.getByRole('radio', { name: /Red Team/ }).first().click()
		
		// Fill in first name
		await page.getByLabelText('First name').fill('Test')
		
		// For password-based signup, need password fields
		if (await page.getByLabelText('Password').isVisible()) {
			await page.getByLabelText('Password').fill('TestPass123!')
			await page.getByLabelText('Confirm Password').fill('TestPass123!')
		}
		
		await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
	})
})

test.describe('Accessibility', () => {
	test('login form should be accessible', async ({ page }) => {
		await page.goto('/login')
		
		// Check form labels are properly associated
		await expect(page.getByLabelText('Email address')).toBeVisible()
		await expect(page.getByLabelText('Password')).toBeVisible()
		
		// Check button states are announced
		const signInButton = page.getByRole('button', { name: 'Sign in' })
		await expect(signInButton).toBeVisible()
		
		// Check error messages are properly announced
		await page.getByLabelText('Email address').fill('invalid')
		await signInButton.click()
		
		// Should have accessible error messages
		await expect(page.getByRole('alert')).toBeVisible()
	})

	test('password reset form should be accessible', async ({ page }) => {
		await page.goto('/reset-password')
		
		await expect(page.getByLabelText('New Password')).toBeVisible()
		await expect(page.getByLabelText('Confirm Password')).toBeVisible()
		
		// Password requirements should be accessible
		const requirements = page.getByText('Password Requirements').locator('..')
		await expect(requirements).toBeVisible()
	})
})