import type React from 'react'

type MdxRemoteComponentRegistry = Record<string, React.ComponentType<any>>

function createMdxRemoteComponentRegistry(
	components: MdxRemoteComponentRegistry,
): MdxRemoteComponentRegistry {
	return { ...components }
}

export { createMdxRemoteComponentRegistry }
export type { MdxRemoteComponentRegistry }
