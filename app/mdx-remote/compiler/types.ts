type MdxRemoteExpressionValue = {
	type: 'expression'
	value: string
}

type MdxRemoteNodeValue = {
	type: 'node'
	value: MdxRemoteNode
}

type MdxRemotePropValue =
	| string
	| number
	| boolean
	| null
	| MdxRemoteExpressionValue
	| MdxRemoteNodeValue
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

type MdxRemoteLambdaBody =
	| {
			kind: 'node'
			node: MdxRemoteNode
	  }
	| {
			kind: 'conditional'
			test: string
			consequent: MdxRemoteNode
			alternate: MdxRemoteNode
	  }

type MdxRemoteLambdaNode = {
	type: 'lambda'
	parameter: string
	body: MdxRemoteLambdaBody
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
	| MdxRemoteLambdaNode
	| MdxRemoteElementNode
	| MdxRemoteRootNode

type MdxRemoteDocument<Frontmatter extends Record<string, unknown>> = {
	schemaVersion: 1
	slug: string
	frontmatter: Frontmatter
	root: MdxRemoteRootNode
	compiledAt: string
}

function isExpressionPropValue(
	value: MdxRemotePropValue,
): value is MdxRemoteExpressionValue {
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

function isNodePropValue(value: MdxRemotePropValue): value is MdxRemoteNodeValue {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		'type' in value &&
		value.type === 'node' &&
		'value' in value &&
		typeof value.value === 'object' &&
		value.value !== null
	)
}

export { isExpressionPropValue, isNodePropValue }

export type {
	MdxRemoteDocument,
	MdxRemoteElementNode,
	MdxRemoteExpressionNode,
	MdxRemoteExpressionValue,
	MdxRemoteLambdaBody,
	MdxRemoteLambdaNode,
	MdxRemoteNode,
	MdxRemoteNodeValue,
	MdxRemotePropValue,
	MdxRemoteRootNode,
	MdxRemoteTextNode,
}
