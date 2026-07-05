#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(siteDir, 'migrations')

function formatTimestamp(date) {
	const pad = (value, length = 2) => String(value).padStart(length, '0')
	return [
		date.getUTCFullYear(),
		pad(date.getUTCMonth() + 1),
		pad(date.getUTCDate()),
		pad(date.getUTCHours()),
		pad(date.getUTCMinutes()),
		pad(date.getUTCSeconds()),
	].join('')
}

function toSnakeName(name) {
	const normalized = name
		.trim()
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toLowerCase()
	if (!normalized) {
		throw new Error('Migration name is required (e.g. add_my_column)')
	}
	return normalized
}

function main() {
	const rawName = process.argv.slice(2).join(' ').trim()
	if (!rawName || rawName === '--help' || rawName === '-h') {
		console.log('Usage: npm run db:migration:new -- <snake_or_kebab_name>')
		process.exit(rawName ? 0 : 1)
	}

	const snakeName = toSnakeName(rawName)
	const filename = `${formatTimestamp(new Date())}_${snakeName}.sql`
	const filePath = path.join(migrationsDir, filename)

	fs.mkdirSync(migrationsDir, { recursive: true })
	fs.writeFileSync(
		filePath,
		`-- Migration: ${snakeName}\n-- Created: ${new Date().toISOString()}\n\n`,
	)

	console.log(`Created ${path.relative(siteDir, filePath)}`)
}

main()
