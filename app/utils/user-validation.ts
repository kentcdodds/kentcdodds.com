import { z } from 'zod'

export const PasswordSchema = z
	.string({ required_error: 'Password is required' })
	.min(6, { message: 'Password is too short' })
	.max(100, { message: 'Password is too long' })

export const NameSchema = z
	.string({ required_error: 'Name is required' })
	.min(1, { message: 'Name is required' })
	.max(40, { message: 'Name is too long' })
	.regex(/^[a-zA-Z\s'`\-\.]+$/, {
		message: 'Name can only include letters, spaces, and some punctuation',
	})

export const UsernameSchema = z
	.string({ required_error: 'Username is required' })
	.min(3, { message: 'Username is too short' })
	.max(20, { message: 'Username is too long' })
	.regex(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only include letters, numbers, and underscores',
	})
	// users can type the username in any case, but we store it in lowercase
	.transform((value) => value.toLowerCase())

export const EmailSchema = z
	.string({ required_error: 'Email is required' })
	.email({ message: 'Email is invalid' })
	.min(3, { message: 'Email is too short' })
	.max(100, { message: 'Email is too long' })
	// users can type the email in any case, but we store it in lowercase
	.transform((value) => value.toLowerCase())

export function getPasswordValidationMessage(password: string) {
	if (password.length < 6) {
		return 'Password is too short'
	}
	if (password.length > 100) {
		return 'Password is too long'
	}
	if (!/[A-Z]/.test(password)) {
		return 'Password must contain at least one uppercase letter'
	}
	if (!/[a-z]/.test(password)) {
		return 'Password must contain at least one lowercase letter'
	}
	if (!/[0-9]/.test(password)) {
		return 'Password must contain at least one number'
	}
	if (!/[^a-zA-Z0-9]/.test(password)) {
		return 'Password must contain at least one special character'
	}
	return null
}

export function isPasswordValid(password: string): boolean {
	return getPasswordValidationMessage(password) === null
}