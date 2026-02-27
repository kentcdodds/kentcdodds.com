import {
	type MdxRemoteDocument,
	type MdxRemoteNode,
	type MdxRemotePropValue,
	type MdxRemoteRootNode,
} from '#app/mdx-remote/compiler/types.ts'

function assertMdxRemoteDocument<Frontmatter extends Record<string, unknown>>(
	value: unknown,
): asserts value is MdxRemoteDocument<Frontmatter> {
	if (!value || typeof value !== 'object') {
		throw new Error('MDX remote document must be an object')
	}
	const candidate = value as Partial<MdxRemoteDocument<Frontmatter>>
	if (candidate.schemaVersion !== 1) {
		throw new Error('MDX remote document schemaVersion must be 1')
	}
	if (typeof candidate.slug !== 'string' || !candidate.slug) {
		throw new Error('MDX remote document slug must be a non-empty string')
	}
	if (!candidate.frontmatter || typeof candidate.frontmatter !== 'object') {
		throw new Error('MDX remote document frontmatter must be an object')
	}
	if (typeof candidate.compiledAt !== 'string' || !candidate.compiledAt) {
		throw new Error('MDX remote document compiledAt must be a non-empty string')
	}
	assertMdxRemoteRootNode(candidate.root)
}

function assertMdxRemoteRootNode(value: unknown): asserts value is MdxRemoteRootNode {
	if (!value || typeof value !== 'object') {
		throw new Error('MDX remote root node must be an object')
	}
	const node = value as Partial<MdxRemoteRootNode>
	if (node.type !== 'root') {
		throw new Error('MDX remote root node must have type "root"')
	}
	if (!Array.isArray(node.children)) {
		throw new Error('MDX remote root node children must be an array')
	}
	for (const child of node.children) {
		assertMdxRemoteNode(child)
	}
}

function assertMdxRemoteNode(value: unknown): asserts value is MdxRemoteNode {
	if (!value || typeof value !== 'object') {
		throw new Error('MDX remote node must be an object')
	}
	const node = value as Partial<MdxRemoteNode>
	if (node.type === 'text') {
		if (typeof node.value !== 'string') {
			throw new Error('Text node must have a string value')
		}
		return
	}
	if (node.type === 'expression') {
		if (typeof node.value !== 'string') {
			throw new Error('Expression node must have a string value')
		}
		return
	}
	if (node.type === 'lambda') {
		if (typeof node.parameter !== 'string' || !node.parameter) {
			throw new Error('Lambda node must have a non-empty parameter')
		}
		if (!node.body || typeof node.body !== 'object') {
			throw new Error('Lambda node body must be an object')
		}
		if (node.body.kind === 'node') {
			assertMdxRemoteNode(node.body.node)
			return
		}
		if (node.body.kind === 'conditional') {
			if (typeof node.body.test !== 'string') {
				throw new Error('Lambda conditional body must have test expression')
			}
			assertMdxRemoteNode(node.body.consequent)
			assertMdxRemoteNode(node.body.alternate)
			return
		}
		throw new Error(`Unsupported lambda body kind: ${(node.body as { kind?: string }).kind ?? 'unknown'}`)
	}
	if (node.type === 'element') {
		if (typeof node.name !== 'string' || !node.name) {
			throw new Error('Element node must have a non-empty name')
		}
		if (node.props) {
			if (typeof node.props !== 'object' || Array.isArray(node.props)) {
				throw new Error('Element props must be an object when present')
			}
			for (const propValue of Object.values(node.props)) {
				assertMdxRemotePropValue(propValue)
			}
		}
		if (node.children) {
			if (!Array.isArray(node.children)) {
				throw new Error('Element children must be an array when present')
			}
			for (const child of node.children) {
				assertMdxRemoteNode(child)
			}
		}
		return
	}
	if (node.type === 'root') {
		assertMdxRemoteRootNode(node)
		return
	}
	throw new Error(`Unsupported node type: ${(node as { type?: string }).type ?? 'unknown'}`)
}

function assertMdxRemotePropValue(value: unknown): asserts value is MdxRemotePropValue {
	if (value === null) return
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			assertMdxRemotePropValue(item)
		}
		return
	}
	if (!value || typeof value !== 'object') {
		throw new Error('Invalid prop value type in MDX remote document')
	}

	const expressionValue = value as { type?: string; value?: unknown }
	if (expressionValue.type === 'expression') {
		if (typeof expressionValue.value !== 'string') {
			throw new Error('Expression prop value must be a string')
		}
		return
	}
	if (expressionValue.type === 'node') {
		assertMdxRemoteNode(expressionValue.value)
		return
	}

	for (const item of Object.values(value as Record<string, unknown>)) {
		assertMdxRemotePropValue(item)
	}
}

function serializeMdxRemoteDocument<Frontmatter extends Record<string, unknown>>(
	document: MdxRemoteDocument<Frontmatter>,
) {
	assertMdxRemoteDocument(document)
	return JSON.stringify(document)
}

function deserializeMdxRemoteDocument<Frontmatter extends Record<string, unknown>>(
	source: string,
) {
	const parsed = JSON.parse(source) as unknown
	assertMdxRemoteDocument<Frontmatter>(parsed)
	return parsed
}

export {
	assertMdxRemoteDocument,
	assertMdxRemoteNode,
	assertMdxRemoteRootNode,
	deserializeMdxRemoteDocument,
	serializeMdxRemoteDocument,
}
