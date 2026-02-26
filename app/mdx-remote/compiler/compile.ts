import {
	runMdxRemoteCompilerPlugins,
	type MdxRemoteCompilerPlugin,
} from '#app/mdx-remote/compiler/plugins.ts'
import {
	assertMdxRemoteRootNode,
	serializeMdxRemoteDocument,
} from '#app/mdx-remote/compiler/serialize.ts'
import {
	type MdxRemoteDocument,
	type MdxRemoteNode,
	type MdxRemotePropValue,
	type MdxRemoteRootNode,
	isExpressionPropValue,
	isNodePropValue,
} from '#app/mdx-remote/compiler/types.ts'
import { parseMdxRemoteExpression } from '#app/mdx-remote/runtime/expression.ts'

const blockedPropertyNames = new Set(['__proto__', 'prototype', 'constructor'])
const blockedIdentifierNames = new Set(['import', 'export', 'new'])
const blockedCallCalleeNames = new Set(['eval', 'Function'])
const allowedUnaryOperators = new Set(['!', '+', '-'])
const allowedBinaryOperators = new Set([
	'+',
	'-',
	'*',
	'/',
	'%',
	'===',
	'!==',
	'==',
	'!=',
	'<',
	'<=',
	'>',
	'>=',
])
const allowedLogicalOperators = new Set(['&&', '||', '??'])

function compileMdxRemoteDocument<Frontmatter extends Record<string, unknown>>({
	slug,
	frontmatter,
	root,
	allowedComponentNames,
	strictComponentValidation = true,
	strictExpressionValidation = true,
	plugins = [],
	compiledAt = new Date().toISOString(),
}: {
	slug: string
	frontmatter: Frontmatter
	root: MdxRemoteRootNode
	allowedComponentNames: Array<string>
	strictComponentValidation?: boolean
	strictExpressionValidation?: boolean
	plugins?: Array<MdxRemoteCompilerPlugin<Frontmatter>>
	compiledAt?: string
}) {
	assertMdxRemoteRootNode(root)
	const allowedComponentNameSet = new Set(allowedComponentNames)
	assertNodeTreeIsSafe({
		root,
		allowedComponentNames: allowedComponentNameSet,
		strictComponentValidation,
		strictExpressionValidation,
	})

	const document: MdxRemoteDocument<Frontmatter> = {
		schemaVersion: 1,
		slug,
		frontmatter,
		root,
		compiledAt,
	}

	return runMdxRemoteCompilerPlugins({
		document,
		plugins,
		allowedComponentNames: allowedComponentNameSet,
	}).then(() => ({
		document,
		serialized: serializeMdxRemoteDocument(document),
	}))
}

function assertNodeTreeIsSafe({
	root,
	allowedComponentNames,
	strictComponentValidation,
	strictExpressionValidation,
}: {
	root: MdxRemoteRootNode
	allowedComponentNames: ReadonlySet<string>
	strictComponentValidation: boolean
	strictExpressionValidation: boolean
}) {
	visitNode(root, (node) => {
		if (node.type === 'element') {
			if (
				strictComponentValidation &&
				isMdxComponentName(node.name) &&
				!allowedComponentNames.has(node.name)
			) {
				throw new Error(`Unknown MDX component "${node.name}"`)
			}
			for (const value of Object.values(node.props ?? {})) {
				assertPropValueIsSafe({
					value,
					allowedComponentNames,
					strictComponentValidation,
					strictExpressionValidation,
				})
			}
			return
		}
		if (node.type === 'expression' && strictExpressionValidation) {
			assertExpressionIsSafe(node.value)
		}
		if (
			node.type === 'lambda' &&
			node.body.kind === 'conditional' &&
			strictExpressionValidation
		) {
			assertExpressionIsSafe(node.body.test)
		}
	})
}

function visitNode(node: MdxRemoteNode, visitor: (node: MdxRemoteNode) => void) {
	visitor(node)
	if (node.type === 'lambda') {
		if (node.body.kind === 'node') {
			visitNode(node.body.node, visitor)
		}
		if (node.body.kind === 'conditional') {
			visitNode(node.body.consequent, visitor)
			visitNode(node.body.alternate, visitor)
		}
		return
	}
	if (node.type === 'root' || node.type === 'element') {
		for (const child of node.children ?? []) {
			visitNode(child, visitor)
		}
	}
}

function assertPropValueIsSafe({
	value,
	allowedComponentNames,
	strictComponentValidation,
	strictExpressionValidation,
}: {
	value: MdxRemotePropValue
	allowedComponentNames: ReadonlySet<string>
	strictComponentValidation: boolean
	strictExpressionValidation: boolean
}) {
	if (value === null) return
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			assertPropValueIsSafe({
				value: item,
				allowedComponentNames,
				strictComponentValidation,
				strictExpressionValidation,
			})
		}
		return
	}
	if (isExpressionPropValue(value) && strictExpressionValidation) {
		assertExpressionIsSafe(value.value)
		return
	}
	if (isNodePropValue(value)) {
		visitNode(value.value, (node) => {
			if (
				node.type === 'element' &&
				strictComponentValidation &&
				isMdxComponentName(node.name) &&
				!allowedComponentNames.has(node.name)
			) {
				throw new Error(`Unknown MDX component "${node.name}"`)
			}
			if (node.type === 'expression' && strictExpressionValidation) {
				assertExpressionIsSafe(node.value)
			}
		})
		return
	}
	for (const item of Object.values(value)) {
		assertPropValueIsSafe({
			value: item,
			allowedComponentNames,
			strictComponentValidation,
			strictExpressionValidation,
		})
	}
}

function assertExpressionIsSafe(source: string) {
	const ast = parseExpressionAstOrThrow(source)
	assertExpressionAstNodeIsSafe({ source, node: ast })
}

function parseExpressionAstOrThrow(source: string) {
	try {
		return parseMdxRemoteExpression(source)
	} catch (error) {
		throw new Error(
			`Invalid MDX expression syntax "${source}": ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

function assertExpressionAstNodeIsSafe({
	source,
	node,
}: {
	source: string
	node: Record<string, unknown>
}) {
	const nodeType = String(node.type ?? '')
	switch (nodeType) {
		case 'Literal':
			return
		case 'Identifier': {
			const identifierName = String(node.name ?? '')
			if (blockedIdentifierNames.has(identifierName)) {
				throw new Error(`Forbidden expression syntax: ${source}`)
			}
			return
		}
		case 'ArrayExpression': {
			const elements = Array.isArray(node.elements) ? node.elements : []
			for (const element of elements) {
				if (!element || typeof element !== 'object') continue
				assertExpressionAstNodeIsSafe({
					source,
					node: element as Record<string, unknown>,
				})
			}
			return
		}
		case 'ConditionalExpression': {
			assertChildExpressionNodeIsSafe({ source, node: node.test })
			assertChildExpressionNodeIsSafe({ source, node: node.consequent })
			assertChildExpressionNodeIsSafe({ source, node: node.alternate })
			return
		}
		case 'UnaryExpression': {
			const operator = String(node.operator ?? '')
			if (!allowedUnaryOperators.has(operator)) {
				throw new Error(`Unsupported unary operator "${operator}" in expression: ${source}`)
			}
			assertChildExpressionNodeIsSafe({ source, node: node.argument })
			return
		}
		case 'BinaryExpression': {
			const operator = String(node.operator ?? '')
			if (!allowedBinaryOperators.has(operator)) {
				throw new Error(
					`Unsupported binary operator "${operator}" in expression: ${source}`,
				)
			}
			assertChildExpressionNodeIsSafe({ source, node: node.left })
			assertChildExpressionNodeIsSafe({ source, node: node.right })
			return
		}
		case 'LogicalExpression': {
			const operator = String(node.operator ?? '')
			if (!allowedLogicalOperators.has(operator)) {
				throw new Error(
					`Unsupported logical operator "${operator}" in expression: ${source}`,
				)
			}
			assertChildExpressionNodeIsSafe({ source, node: node.left })
			assertChildExpressionNodeIsSafe({ source, node: node.right })
			return
		}
		case 'MemberExpression': {
			assertChildExpressionNodeIsSafe({ source, node: node.object })
			const computed = Boolean(node.computed)
			if (!computed) {
				assertIdentifierPropertyIsSafe({
					source,
					property: node.property,
				})
				return
			}
			assertChildExpressionNodeIsSafe({ source, node: node.property })
			assertLiteralPropertyIsSafe({
				source,
				property: node.property,
			})
			return
		}
		case 'CallExpression': {
			const callee = asRecord(node.callee)
			const calleeType = String(callee?.type ?? '')
			if (calleeType !== 'Identifier') {
				throw new Error(`Forbidden expression syntax: ${source}`)
			}
			const calleeName = String(callee?.name ?? '')
			if (blockedCallCalleeNames.has(calleeName)) {
				throw new Error(`Forbidden expression syntax: ${source}`)
			}
			const args = Array.isArray(node.arguments) ? node.arguments : []
			for (const arg of args) {
				assertChildExpressionNodeIsSafe({ source, node: arg })
			}
			return
		}
		default:
			throw new Error(`Forbidden expression syntax: ${source}`)
	}
}

function assertChildExpressionNodeIsSafe({
	source,
	node,
}: {
	source: string
	node: unknown
}) {
	const child = asRecord(node)
	if (!child) {
		throw new Error(`Forbidden expression syntax: ${source}`)
	}
	assertExpressionAstNodeIsSafe({ source, node: child })
}

function assertIdentifierPropertyIsSafe({
	source,
	property,
}: {
	source: string
	property: unknown
}) {
	const propertyRecord = asRecord(property)
	const propertyType = String(propertyRecord?.type ?? '')
	if (propertyType !== 'Identifier') {
		throw new Error(`Forbidden expression syntax: ${source}`)
	}
	const propertyName = String(propertyRecord?.name ?? '')
	if (blockedPropertyNames.has(propertyName)) {
		throw new Error(`Forbidden expression syntax: ${source}`)
	}
}

function assertLiteralPropertyIsSafe({
	source,
	property,
}: {
	source: string
	property: unknown
}) {
	const propertyRecord = asRecord(property)
	if (!propertyRecord || String(propertyRecord.type ?? '') !== 'Literal') return
	const propertyValue = propertyRecord.value
	if (
		(typeof propertyValue === 'string' || typeof propertyValue === 'number') &&
		blockedPropertyNames.has(String(propertyValue))
	) {
		throw new Error(`Forbidden expression syntax: ${source}`)
	}
}

function asRecord(value: unknown) {
	if (!value || typeof value !== 'object') return null
	return value as Record<string, unknown>
}

function isMdxComponentName(name: string) {
	return /^[A-Z]/.test(name)
}

export { compileMdxRemoteDocument, isMdxComponentName }
