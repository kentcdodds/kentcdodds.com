import jsep from 'jsep'

const blockedPropertyNames = new Set(['__proto__', 'prototype', 'constructor'])

type ExpressionAstNode = {
	type: string
	[key: string]: unknown
}

function parseMdxRemoteExpression(source: string) {
	return jsep(source) as unknown as ExpressionAstNode
}

function evaluateMdxRemoteExpression({
	source,
	scope,
	allowCalls = {},
}: {
	source: string
	scope: Record<string, unknown>
	allowCalls?: Record<string, (...args: Array<unknown>) => unknown>
}) {
	return evaluateAstNode({
		node: parseMdxRemoteExpression(source),
		scope,
		allowCalls,
	})
}

function evaluateAstNode({
	node,
	scope,
	allowCalls,
}: {
	node: ExpressionAstNode
	scope: Record<string, unknown>
	allowCalls: Record<string, (...args: Array<unknown>) => unknown>
}): unknown {
	switch (node.type) {
		case 'Literal':
			return node.value
		case 'Identifier':
			return scope[String(node.name)]
		case 'ArrayExpression':
			return (node.elements as Array<ExpressionAstNode | null | undefined>).map(
				(element) => {
					if (!element) return null
					return evaluateAstNode({ node: element, scope, allowCalls })
				},
			)
		case 'ConditionalExpression':
			return evaluateAstNode({
				node: node.test as ExpressionAstNode,
				scope,
				allowCalls,
			})
				? evaluateAstNode({
						node: node.consequent as ExpressionAstNode,
						scope,
						allowCalls,
					})
				: evaluateAstNode({
						node: node.alternate as ExpressionAstNode,
						scope,
						allowCalls,
					})
		case 'UnaryExpression':
			return evaluateUnaryExpression({
				operator: String(node.operator),
				value: evaluateAstNode({
					node: node.argument as ExpressionAstNode,
					scope,
					allowCalls,
				}),
			})
		case 'BinaryExpression':
			return evaluateBinaryExpression({
				operator: String(node.operator),
				left: evaluateAstNode({
					node: node.left as ExpressionAstNode,
					scope,
					allowCalls,
				}),
				right: evaluateAstNode({
					node: node.right as ExpressionAstNode,
					scope,
					allowCalls,
				}),
			})
		case 'LogicalExpression':
			return evaluateLogicalExpression({
				operator: String(node.operator),
				left: () =>
					evaluateAstNode({
						node: node.left as ExpressionAstNode,
						scope,
						allowCalls,
					}),
				right: () =>
					evaluateAstNode({
						node: node.right as ExpressionAstNode,
						scope,
						allowCalls,
					}),
			})
		case 'MemberExpression':
			return evaluateMemberExpression({ node, scope, allowCalls })
		case 'CallExpression':
			return evaluateCallExpression({ node, scope, allowCalls })
		default:
			throw new Error(`Unsupported expression node type: ${node.type}`)
	}
}

function evaluateUnaryExpression({
	operator,
	value,
}: {
	operator: string
	value: unknown
}) {
	switch (operator) {
		case '!':
			return !value
		case '+':
			return Number(value)
		case '-':
			return -Number(value)
		default:
			throw new Error(`Unsupported unary operator: ${operator}`)
	}
}

function evaluateBinaryExpression({
	operator,
	left,
	right,
}: {
	operator: string
	left: unknown
	right: unknown
}) {
	switch (operator) {
		case '+':
			return (left as any) + (right as any)
		case '-':
			return Number(left) - Number(right)
		case '*':
			return Number(left) * Number(right)
		case '/':
			return Number(left) / Number(right)
		case '%':
			return Number(left) % Number(right)
		case '===':
			return left === right
		case '!==':
			return left !== right
		case '==':
			return left == right
		case '!=':
			return left != right
		case '<':
			return Number(left) < Number(right)
		case '<=':
			return Number(left) <= Number(right)
		case '>':
			return Number(left) > Number(right)
		case '>=':
			return Number(left) >= Number(right)
		default:
			throw new Error(`Unsupported binary operator: ${operator}`)
	}
}

function evaluateLogicalExpression({
	operator,
	left,
	right,
}: {
	operator: string
	left: () => unknown
	right: () => unknown
}) {
	switch (operator) {
		case '&&': {
			const leftValue = left()
			return leftValue ? right() : leftValue
		}
		case '||': {
			const leftValue = left()
			return leftValue ? leftValue : right()
		}
		case '??': {
			const leftValue = left()
			return leftValue ?? right()
		}
		default:
			throw new Error(`Unsupported logical operator: ${operator}`)
	}
}

function evaluateMemberExpression({
	node,
	scope,
	allowCalls,
}: {
	node: ExpressionAstNode
	scope: Record<string, unknown>
	allowCalls: Record<string, (...args: Array<unknown>) => unknown>
}) {
	const objectValue = evaluateAstNode({
		node: node.object as ExpressionAstNode,
		scope,
		allowCalls,
	})
	const propertyName = resolvePropertyName({
		property: node.property as ExpressionAstNode,
		computed: Boolean(node.computed),
		scope,
		allowCalls,
	})
	if (!propertyName || blockedPropertyNames.has(propertyName)) {
		throw new Error(`Access to property "${propertyName}" is not allowed`)
	}
	if (!objectValue || typeof objectValue !== 'object') {
		return undefined
	}
	return (objectValue as Record<string, unknown>)[propertyName]
}

function resolvePropertyName({
	property,
	computed,
	scope,
	allowCalls,
}: {
	property: ExpressionAstNode
	computed: boolean
	scope: Record<string, unknown>
	allowCalls: Record<string, (...args: Array<unknown>) => unknown>
}) {
	if (!computed && property.type === 'Identifier') {
		return String(property.name)
	}
	const evaluated = evaluateAstNode({ node: property, scope, allowCalls })
	if (typeof evaluated === 'string' || typeof evaluated === 'number') {
		return String(evaluated)
	}
	throw new Error('Computed member expression property must resolve to a string or number')
}

function evaluateCallExpression({
	node,
	scope,
	allowCalls,
}: {
	node: ExpressionAstNode
	scope: Record<string, unknown>
	allowCalls: Record<string, (...args: Array<unknown>) => unknown>
}) {
	const callee = node.callee as ExpressionAstNode
	if (callee.type !== 'Identifier') {
		throw new Error('Only direct function calls are allowed in MDX expressions')
	}
	const functionName = String(callee.name)
	const fn = allowCalls[functionName]
	if (!fn) {
		throw new Error(`Function "${functionName}" is not allowed in MDX expressions`)
	}
	const args = ((node.arguments as Array<ExpressionAstNode>) ?? []).map((argument) =>
		evaluateAstNode({ node: argument, scope, allowCalls }),
	)
	return fn(...args)
}

export { evaluateMdxRemoteExpression, parseMdxRemoteExpression }
