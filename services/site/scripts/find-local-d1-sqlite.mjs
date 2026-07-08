#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { localD1StateDir } from './local-d1-state.mjs'

function findLocalD1SqliteFile() {
	if (!fs.existsSync(localD1StateDir)) return null
	const stack = [localD1StateDir]
	while (stack.length > 0) {
		const current = stack.pop()
		if (!current) continue
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name)
			if (entry.isDirectory()) {
				stack.push(fullPath)
				continue
			}
			if (entry.isFile() && entry.name.endsWith('.sqlite')) {
				return fullPath
			}
		}
	}
	return null
}

function main() {
	const sqlitePath = findLocalD1SqliteFile()
	if (!sqlitePath) {
		console.error(
			`Could not find local D1 sqlite under ${localD1StateDir}. Run npm run db:reset --workspace kentcdodds.com or start the dev worker once.`,
		)
		process.exit(1)
	}
	console.log(sqlitePath)
}

main()
