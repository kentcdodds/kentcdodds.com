import path from 'path'
import BetterSqlite3 from 'better-sqlite3'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { invariant } from '@epic-web/invariant'
import { test as base } from '@playwright/test'
import { parse } from 'cookie'
import fsExtra from 'fs-extra'
import {
	createDatabase,
	type Database,
} from '@remix-run/data-table'
import { inList } from '@remix-run/data-table'
import { createSqliteExecutorDataTableAdapter } from '#app/utils/db/d1-data-table-adapter.server.ts'
import { createBetterSqliteExecutor } from '#app/utils/db/better-sqlite-executor.server.ts'
import { userTable, type User } from '#app/utils/db/schema.server.ts'
import { getSession } from '../app/utils/session.server.ts'
import { createUser } from '../prisma/seed-utils.ts'

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.join(e2eDir, '..')

function getLocalD1SqlitePath() {
	const result = spawnSync(
		'node',
		[path.join(siteDir, 'scripts/find-local-d1-sqlite.mjs')],
		{
			cwd: siteDir,
			encoding: 'utf8',
		},
	)
	if (result.status !== 0) {
		throw new Error(
			`Failed to locate local D1 sqlite file:\n${result.stdout}\n${result.stderr}`,
		)
	}
	const sqlitePath = result.stdout.trim().split('\n').at(-1)?.trim()
	invariant(sqlitePath, 'local D1 sqlite path is required for e2e helpers')
	return sqlitePath
}

let e2eDatabase: Database | undefined

function getE2eDatabase() {
	if (!e2eDatabase) {
		const sqlite = new BetterSqlite3(getLocalD1SqlitePath())
		sqlite.pragma('foreign_keys = ON')
		const adapter = createSqliteExecutorDataTableAdapter(
			createBetterSqliteExecutor(sqlite),
		)
		e2eDatabase = createDatabase(adapter, { now: () => new Date() })
	}
	return e2eDatabase
}

type MSWData = {
	email: Record<string, Email>
}

type Email = {
	to: string
	from: string
	subject: string
	text: string
	html: string
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function readEmail(
	recipientOrFilter: string | ((email: Email) => boolean),
	{
		maxRetries = 5,
		retryDelay = 200,
	}: { maxRetries?: number; retryDelay?: number } = {},
) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const mswOutput = fsExtra.readJsonSync(
				path.join(siteDir, './mocks/msw.local.json'),
			) as unknown as MSWData
			const emails = Object.values(mswOutput.email).reverse()
			let email: Email | undefined
			if (typeof recipientOrFilter === 'string') {
				email = emails.find((email: Email) => email.to === recipientOrFilter)
			} else {
				email = emails.find(recipientOrFilter)
			}
			if (email) {
				return email
			}
			if (attempt < maxRetries - 1) {
				await sleep(retryDelay)
			}
		} catch (error: unknown) {
			console.error(
				`Error reading the email fixture (attempt ${attempt + 1})`,
				error,
			)
			if (attempt < maxRetries - 1) {
				await sleep(retryDelay)
			}
		}
	}
	return null
}

export function extractUrl(text: string) {
	const urlRegex = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
	const match = text.match(urlRegex)
	return match?.groups?.url
}

const users = new Set<User>()

export async function insertNewUser(userOverrides?: Partial<User>) {
	const db = getE2eDatabase()
	const user = await db.create(
		userTable,
		{ ...createUser(), ...userOverrides },
		{ returnRow: true },
	)
	users.add(user as User)
	return user as User
}

export async function deleteUserByEmail(email: string) {
	const db = getE2eDatabase()
	const user = await db.findOne(userTable, { where: { email } })
	if (!user) return
	await db.delete(userTable, user.id)
}

export const test = base.extend<{
	login: (userOverrides?: Partial<User>) => Promise<User>
}>({
	login: [
		async ({ page, baseURL }, use) => {
			invariant(baseURL, 'baseURL is required playwright config')
			return use(async (userOverrides) => {
				const user = await insertNewUser(userOverrides)
				const session = await getSession(new Request(baseURL))
				await session.signIn(user)
				const cookieValue = await session.commit()
				invariant(
					cookieValue,
					'Something weird happened creating a session for a new user. No cookie value given from session.commit()',
				)
				const { KCD_root_session } = parse(cookieValue)
				invariant(KCD_root_session, 'No KCD_root_session cookie found')
				await page.context().addCookies([
					{
						name: 'KCD_root_session',
						sameSite: 'Lax',
						url: baseURL,
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						value: KCD_root_session,
					},
				])
				return user
			})
		},
		{ auto: true },
	],
})

export const { expect } = test

test.afterEach(async () => {
	const db = getE2eDatabase()
	const ids = [...users].map((user) => user.id)
	if (ids.length === 0) return
	await db.deleteMany(userTable, {
		where: inList('id', ids),
	})
})
