import { config as defaultConfig } from '@epic-web/config/eslint'

/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		ignores: ['worker-configuration.d.ts', '.wrangler'],
	},
	...defaultConfig,
]
