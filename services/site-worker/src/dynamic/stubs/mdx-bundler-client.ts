import type { ComponentType } from 'react'

export function getMDXComponent(
	_code: string,
	_globals?: Record<string, unknown>,
): ComponentType {
	throw new Error(
		'mdx-bundler getMDXComponent is unavailable in the worker build; use registerMdxComponentForCode instead.',
	)
}
