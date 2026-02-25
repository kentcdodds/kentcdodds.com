import * as React from 'react'
import {
	type MdxRemoteDocument,
	type MdxRemoteExpressionValue,
	type MdxRemoteNode,
	type MdxRemotePropValue,
} from '#app/mdx-remote/compiler/types.ts'
import {
	type MdxRemoteComponentRegistry,
} from '#app/mdx-remote/runtime/components.ts'
import { type MdxRemoteRuntimeContext } from '#app/mdx-remote/runtime/context.ts'
import { evaluateMdxRemoteExpression } from '#app/mdx-remote/runtime/expression.ts'

function renderMdxRemoteDocument<Frontmatter extends Record<string, unknown>>({
	document,
	context,
	components = {},
}: {
	document: MdxRemoteDocument<Frontmatter>
	context: MdxRemoteRuntimeContext
	components?: MdxRemoteComponentRegistry
}) {
	return renderMdxRemoteNode({
		node: document.root,
		context,
		components,
		keyPrefix: 'root',
	})
}

function renderMdxRemoteNode({
	node,
	context,
	components,
	keyPrefix,
}: {
	node: MdxRemoteNode
	context: MdxRemoteRuntimeContext
	components: MdxRemoteComponentRegistry
	keyPrefix: string
}): React.ReactNode {
	if (node.type === 'root') {
		return React.createElement(
			React.Fragment,
			null,
			...(node.children ?? []).map((child, index) =>
				renderMdxRemoteNode({
					node: child,
					context,
					components,
					keyPrefix: `${keyPrefix}.${index}`,
				}),
			),
		)
	}
	if (node.type === 'text') {
		return node.value
	}
	if (node.type === 'expression') {
		return evaluateMdxRemoteExpression({
			source: node.value,
			scope: context.scope,
			allowCalls: context.allowCalls,
		}) as React.ReactNode
	}

	const component =
		components[node.name] ?? (/^[a-z]/.test(node.name) ? node.name : null)
	if (!component) {
		throw new Error(`Unknown MDX runtime component: ${node.name}`)
	}

	const resolvedProps = resolveProps({
		props: node.props ?? {},
		context,
	})

	const children = (node.children ?? []).map((child, index) =>
		renderMdxRemoteNode({
			node: child,
			context,
			components,
			keyPrefix: `${keyPrefix}.${index}`,
		}),
	)

	return React.createElement(component as React.ElementType, {
		key: keyPrefix,
		...resolvedProps,
		children,
	})
}

function resolveProps({
	props,
	context,
}: {
	props: Record<string, MdxRemotePropValue>
	context: MdxRemoteRuntimeContext
}) {
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => [
			key,
			resolvePropValue({
				value,
				context,
			}),
		]),
	)
}

function resolvePropValue({
	value,
	context,
}: {
	value: MdxRemotePropValue
	context: MdxRemoteRuntimeContext
}): unknown {
	if (value === null) return null
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value
	}
	if (Array.isArray(value)) {
		return value.map((item) => resolvePropValue({ value: item, context }))
	}
	if (isExpressionPropValue(value)) {
		return evaluateMdxRemoteExpression({
			source: value.value,
			scope: context.scope,
			allowCalls: context.allowCalls,
		})
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => [
			key,
			resolvePropValue({
				value: nestedValue,
				context,
			}),
		]),
	)
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

export { renderMdxRemoteDocument, renderMdxRemoteNode }
