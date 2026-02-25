import { expect, test } from 'vitest'
import {
	evaluateMdxRemoteExpression,
	parseMdxRemoteExpression,
} from '#app/mdx-remote/runtime/expression.ts'

test('parses expressions into AST nodes', () => {
	const ast = parseMdxRemoteExpression('user.name ? greeting : fallback')
	expect(ast.type).toBe('ConditionalExpression')
})

test('evaluates identifiers, member access, and conditionals', () => {
	const result = evaluateMdxRemoteExpression({
		source: 'user.name ? user.name : fallback',
		scope: {
			user: { name: 'Kent' },
			fallback: 'Anonymous',
		},
	})
	expect(result).toBe('Kent')
})

test('supports explicit allowlisted function calls', () => {
	const result = evaluateMdxRemoteExpression({
		source: 'upper(user.name)',
		scope: {
			user: { name: 'kent' },
		},
		allowCalls: {
			upper: (value) => String(value).toUpperCase(),
		},
	})
	expect(result).toBe('KENT')
})

test('rejects non-allowlisted function calls', () => {
	expect(() =>
		evaluateMdxRemoteExpression({
			source: 'dangerous(user.name)',
			scope: {
				user: { name: 'kent' },
			},
		}),
	).toThrow(/not allowed/i)
})

test('blocks dangerous member properties', () => {
	expect(() =>
		evaluateMdxRemoteExpression({
			source: 'user.__proto__',
			scope: {
				user: { name: 'kent' },
			},
		}),
	).toThrow(/not allowed/i)
})
