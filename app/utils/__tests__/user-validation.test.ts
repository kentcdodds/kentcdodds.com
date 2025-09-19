import { describe, expect, test } from 'vitest'
import { getPasswordValidationMessage } from '../user-validation.ts'

describe('user-validation', () => {
	describe('getPasswordValidationMessage', () => {
		test('returns null for valid password', () => {
			const validPasswords = [
				'Password123!',
				'MySecure1@',
				'Test9$password',
				'Complex1@Password',
				'Strong2#Pass',
			]

			validPasswords.forEach((password) => {
				expect(getPasswordValidationMessage(password)).toBeNull()
			})
		})

		test('returns error for password too short', () => {
			const shortPasswords = ['', 'a', 'ab', 'abc', 'abcd', 'abcde']

			shortPasswords.forEach((password) => {
				const result = getPasswordValidationMessage(password)
				expect(result).toBe('Password must be at least 6 characters')
			})
		})

		test('returns error for password missing uppercase letter', () => {
			const noUppercasePasswords = [
				'password123!',
				'mypassword1@',
				'test9$pass',
			]

			noUppercasePasswords.forEach((password) => {
				const result = getPasswordValidationMessage(password)
				expect(result).toContain('uppercase letter')
			})
		})

		test('returns error for password missing lowercase letter', () => {
			const noLowercasePasswords = ['PASSWORD123!', 'MYPASSWORD1@', 'TEST9$PASS']

			noLowercasePasswords.forEach((password) => {
				const result = getPasswordValidationMessage(password)
				expect(result).toContain('lowercase letter')
			})
		})

		test('returns error for password missing number', () => {
			const noNumberPasswords = ['Password!', 'MyPassword@', 'Test$password']

			noNumberPasswords.forEach((password) => {
				const result = getPasswordValidationMessage(password)
				expect(result).toContain('number')
			})
		})

		test('returns error for password missing special character', () => {
			const noSpecialCharPasswords = [
				'Password123',
				'MyPassword1',
				'Test9password',
			]

			noSpecialCharPasswords.forEach((password) => {
				const result = getPasswordValidationMessage(password)
				expect(result).toContain('special character')
			})
		})

		test('returns first validation error encountered', () => {
			// This tests the order of validation checks
			const result = getPasswordValidationMessage('abc') // short, no uppercase, no number, no special char
			expect(result).toBe('Password must be at least 6 characters')
		})

		test('handles edge cases', () => {
			// Empty password
			expect(getPasswordValidationMessage('')).toBe('Password must be at least 6 characters')

			// Null/undefined
			expect(getPasswordValidationMessage(null as any)).toBe(
				'Password must be at least 6 characters',
			)
			expect(getPasswordValidationMessage(undefined as any)).toBe(
				'Password must be at least 6 characters',
			)
		})

		test('accepts various special characters', () => {
			const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')']

			specialChars.forEach((char) => {
				const password = `Password1${char}`
				expect(getPasswordValidationMessage(password)).toBeNull()
			})
		})

		test('exactly 6 characters is valid if all requirements met', () => {
			const password = 'Pass1!'
			expect(getPasswordValidationMessage(password)).toBeNull()
		})

		test('long password is valid if all requirements met', () => {
			const password = 'ThisIsAVeryLongPasswordWithNumbers123AndSpecialChars!'
			expect(getPasswordValidationMessage(password)).toBeNull()
		})
	})
})