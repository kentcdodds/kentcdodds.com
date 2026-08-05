import { expect, test } from 'vitest'
import { createMailtoHref } from '../misc.ts'

test('createMailtoHref percent-encodes spaces as %20 for email clients', () => {
	const href = createMailtoHref({
		email: 'caller@example.com',
		subject: 'Re: Call Kent - This probably could be an email :)',
		body: 'I just wanted to talk about your call on the Call Kent podcast',
	})

	expect(href).toBe(
		'mailto:caller@example.com?subject=Re%3A%20Call%20Kent%20-%20This%20probably%20could%20be%20an%20email%20%3A)&body=I%20just%20wanted%20to%20talk%20about%20your%20call%20on%20the%20Call%20Kent%20podcast',
	)
	expect(href).not.toContain('+')
})

test('createMailtoHref encodes literal plus signs without turning spaces into +', () => {
	const href = createMailtoHref({
		email: 'caller@example.com',
		subject: 'C++ tips',
		body: 'a + b',
	})

	expect(href).toBe(
		'mailto:caller@example.com?subject=C%2B%2B%20tips&body=a%20%2B%20b',
	)
})

test('createMailtoHref omits the query when subject and body are absent', () => {
	expect(createMailtoHref({ email: 'caller@example.com' })).toBe(
		'mailto:caller@example.com',
	)
})
