import { type ComponentType } from 'react'

/**
 * Server-side registry for worker-imported MDX modules (no eval). Keyed by the
 * mdx-bundler `code` string returned to route loaders. Kept in a plain `.ts`
 * module (no JSX) so Node-based tooling like the MDX artifact compiler can
 * import the server module graph without a TSX transform.
 */
const serverMdxRegistry = new Map<
	string,
	ComponentType<Record<string, unknown>>
>()

export function registerMdxComponentForCode(
	code: string,
	mod: { default: ComponentType<Record<string, unknown>> },
) {
	serverMdxRegistry.set(code, mod.default)
}

export function getRegisteredMdxComponent(code: string) {
	return serverMdxRegistry.get(code)
}
