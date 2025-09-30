import { config as defaultConfig } from '@epic-web/config/eslint'

/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		ignores: ['./oauth', './app/utils/prisma-generated.server'],
	},
	...defaultConfig,
]
