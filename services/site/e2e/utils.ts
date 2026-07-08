import fs from 'node:fs'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { invariant } from '@epic-web/invariant'
import { test as base } from '@playwright/test'
import { parse } from 'cookie'
import fsExtra from 'fs-extra'
import { createCookieSessionStorage } from 'react-router'
import {
	createDatabase,
	type Database,
} from '@remix-run/data-table'
import { inList } from '@remix-run/data-table'
import { createSqliteExecutorDataTableAdapter } from '#app/utils/db/d1-data-table-adapter.server.ts'
import { createNodeSqliteExecutor } from '#app/utils/db/node-sqlite-executor.server.ts'
import { sessionTable, userTable, type User } from '#app/utils/db/schema.server.ts'
import { getEnv } from '#app/utils/env.server.ts'
import { sessionExpirationTime } from '#app/utils/user-data.server.ts'
import { localD1StateDir } from '../scripts/local-d1-state.mjs'
import { createUser } from '../tests/fixtures/user.ts'

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.join(e2eDir, '..')
const sessionIdKey = '__session_id__' as const

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

function getLocalD1SqlitePath() {
	const sqlitePath = findLocalD1SqliteFile()
	if (!sqlitePath) {
		throw new Error(
			`Could not find local D1 sqlite under ${localD1StateDir}. Run npm run db:reset --workspace kentcdodds.com or start the dev worker once.`,
		)
	}
	return sqlitePath
}

let e2eDatabase: Database | undefined

function getE2eDatabase() {
	if (!e2eDatabase) {
		const sqlite = new DatabaseSync(getLocalD1SqlitePath())
		sqlite.exec('PRAGMA foreign_keys = ON')
		const adapter = createSqliteExecutorDataTableAdapter(
			createNodeSqliteExecutor(sqlite),
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
	replyTo?: string
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

async function createE2eSessionCookie(userId: string) {
	const db = getE2eDatabase()
	const userSession = await db.create(
		sessionTable,
		{
			userId,
			expirationDate: new Date(Date.now() + sessionExpirationTime),
		},
		{ returnRow: true },
	)
	const storage = createCookieSessionStorage({
		cookie: {
			name: 'KCD_root_session',
			secure: getEnv().NODE_ENV === 'production' && !getEnv().MOCKS,
			secrets: [getEnv().SESSION_SECRET],
			sameSite: 'lax',
			path: '/',
			maxAge: sessionExpirationTime / 1000,
			httpOnly: true,
		},
	})
	const session = await storage.getSession()
	session.set(sessionIdKey, userSession.id)
	return storage.commitSession(session)
}

export const test = base.extend<{
	login: (userOverrides?: Partial<User>) => Promise<User>
}>({
	login: [
		async ({ page, baseURL }, use) => {
			invariant(baseURL, 'baseURL is required playwright config')
			return use(async (userOverrides) => {
				const user = await insertNewUser(userOverrides)
				const cookieValue = await createE2eSessionCookie(user.id)
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
