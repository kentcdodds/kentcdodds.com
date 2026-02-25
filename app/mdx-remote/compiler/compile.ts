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
	type MdxRemoteExpressionValue,
	type MdxRemoteNode,
	type MdxRemotePropValue,
	type MdxRemoteRootNode,
} from '#app/mdx-remote/compiler/types.ts'

const forbiddenExpressionPatterns = [
	/\bimport\b/,
	/\bexport\b/,
	/\bnew\b/,
	/\beval\b/,
	/\bFunction\b/,
]

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
					strictExpressionValidation,
				})
			}
			return
		}
		if (node.type === 'expression' && strictExpressionValidation) {
			assertExpressionIsSafe(node.value)
		}
	})
}

function visitNode(node: MdxRemoteNode, visitor: (node: MdxRemoteNode) => void) {
	visitor(node)
	if (node.type === 'root' || node.type === 'element') {
		for (const child of node.children ?? []) {
			visitNode(child, visitor)
		}
	}
}

function assertPropValueIsSafe({
	value,
	strictExpressionValidation,
}: {
	value: MdxRemotePropValue
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
				strictExpressionValidation,
			})
		}
		return
	}
	if (isExpressionPropValue(value) && strictExpressionValidation) {
		assertExpressionIsSafe(value.value)
		return
	}
	for (const item of Object.values(value)) {
		assertPropValueIsSafe({
			value: item,
			strictExpressionValidation,
		})
	}
}

function isExpressionPropValue(value: MdxRemotePropValue): value is MdxRemoteExpressionValue {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		'type' in value &&
		value.type === 'expression' &&
		'value' in value &&
		typeof value.value === 'string'
	)
}

function assertExpressionIsSafe(source: string) {
	for (const pattern of forbiddenExpressionPatterns) {
		if (pattern.test(source)) {
			throw new Error(`Forbidden expression syntax: ${source}`)
		}
	}
}

function isMdxComponentName(name: string) {
	return /^[A-Z]/.test(name)
}

export { compileMdxRemoteDocument, isMdxComponentName }
