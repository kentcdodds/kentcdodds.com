type MdxRemoteExpressionValue = {
	type: 'expression'
	value: string
}

type MdxRemotePropValue =
	| string
	| number
	| boolean
	| null
	| MdxRemoteExpressionValue
	| Array<MdxRemotePropValue>
	| { [key: string]: MdxRemotePropValue }

type MdxRemoteTextNode = {
	type: 'text'
	value: string
}

type MdxRemoteExpressionNode = {
	type: 'expression'
	value: string
}

type MdxRemoteElementNode = {
	type: 'element'
	name: string
	props?: Record<string, MdxRemotePropValue>
	children?: Array<MdxRemoteNode>
}

type MdxRemoteRootNode = {
	type: 'root'
	children: Array<MdxRemoteNode>
}

type MdxRemoteNode =
	| MdxRemoteTextNode
	| MdxRemoteExpressionNode
	| MdxRemoteElementNode
	| MdxRemoteRootNode

type MdxRemoteDocument<Frontmatter extends Record<string, unknown>> = {
	schemaVersion: 1
	slug: string
	frontmatter: Frontmatter
	root: MdxRemoteRootNode
	compiledAt: string
}

export type {
	MdxRemoteDocument,
	MdxRemoteElementNode,
	MdxRemoteExpressionNode,
	MdxRemoteExpressionValue,
	MdxRemoteNode,
	MdxRemotePropValue,
	MdxRemoteRootNode,
	MdxRemoteTextNode,
}
