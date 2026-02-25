import * as React from 'react'
import {
	type MdxRemoteDocument,
	type MdxRemoteExpressionValue,
	type MdxRemoteNodeValue,
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
	}) as React.ReactNode
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
}): unknown {
	if (node.type === 'root') {
		const renderedChildren = (node.children ?? []).map((child, index) =>
			renderMdxRemoteNode({
				node: child,
				context,
				components,
				keyPrefix: `${keyPrefix}.${index}`,
			}),
		) as Array<React.ReactNode>
		return React.createElement(
			React.Fragment,
			null,
			...renderedChildren,
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
	if (node.type === 'lambda') {
		return (parameterValue: unknown) => {
			const lambdaScope = {
				...context.scope,
				[node.parameter]: parameterValue,
			}
			const lambdaContext = {
				...context,
				scope: lambdaScope,
			}
			if (node.body.kind === 'node') {
				return renderMdxRemoteNode({
					node: node.body.node,
					context: lambdaContext,
					components,
					keyPrefix: `${keyPrefix}.lambda`,
				})
			}
			const conditionResult = evaluateMdxRemoteExpression({
				source: node.body.test,
				scope: lambdaScope,
				allowCalls: lambdaContext.allowCalls,
			})
			const nextNode = conditionResult
				? node.body.consequent
				: node.body.alternate
			return renderMdxRemoteNode({
				node: nextNode,
				context: lambdaContext,
				components,
				keyPrefix: `${keyPrefix}.lambda.branch`,
			})
		}
	}

	const component =
		components[node.name] ?? (/^[a-z]/.test(node.name) ? node.name : null)
	if (!component) {
		throw new Error(`Unknown MDX runtime component: ${node.name}`)
	}

	const resolvedProps = resolveProps({
		props: node.props ?? {},
		context,
		components,
		keyPrefix: `${keyPrefix}.props`,
	})

	const children = (node.children ?? []).map((child, index) =>
		renderMdxRemoteNode({
			node: child,
			context,
			components,
			keyPrefix: `${keyPrefix}.${index}`,
		}),
	)

	const elementProps: Record<string, unknown> = {
		key: keyPrefix,
		...resolvedProps,
	}
	if (children.length > 0) {
		elementProps.children = children.length === 1 ? children[0] : children
	}

	return React.createElement(component as React.ElementType, elementProps)
}

function resolveProps({
	props,
	context,
	components,
	keyPrefix,
}: {
	props: Record<string, MdxRemotePropValue>
	context: MdxRemoteRuntimeContext
	components: MdxRemoteComponentRegistry
	keyPrefix: string
}) {
	return Object.fromEntries(
		Object.entries(props).map(([key, value], index) => {
			const resolvedValue = resolvePropValue({
				value,
				context,
				components,
				keyPrefix: `${keyPrefix}.${key}.${index}`,
			})
			return [key, resolvedValue]
		}),
	)
}

function resolvePropValue({
	value,
	context,
	components,
	keyPrefix,
}: {
	value: MdxRemotePropValue
	context: MdxRemoteRuntimeContext
	components: MdxRemoteComponentRegistry
	keyPrefix: string
}): unknown {
	if (value === null) return null
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value
	}
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			resolvePropValue({
				value: item,
				context,
				components,
				keyPrefix: `${keyPrefix}.${index}`,
			}),
		)
	}
	if (isExpressionPropValue(value)) {
		return evaluateMdxRemoteExpression({
			source: value.value,
			scope: context.scope,
			allowCalls: context.allowCalls,
		})
	}
	if (isNodePropValue(value)) {
		return renderMdxRemoteNode({
			node: value.value,
			context,
			components,
			keyPrefix: `${keyPrefix}.node`,
		})
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue], index) => {
			const resolvedValue = resolvePropValue({
				value: nestedValue,
				context,
				components,
				keyPrefix: `${keyPrefix}.${key}.${index}`,
			})
			return [key, resolvedValue]
		}),
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

export { renderMdxRemoteDocument, renderMdxRemoteNode }
