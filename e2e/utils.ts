import path from 'path'
import { invariant } from '@epic-web/invariant'
import { test as base } from '@playwright/test'
import { parse } from 'cookie'
import fsExtra from 'fs-extra'
import { type User } from '#app/utils/prisma-generated.server/client.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSession } from '../app/utils/session.server.ts'
import { createUser } from '../prisma/seed-utils.ts'

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
				path.join(process.cwd(), './mocks/msw.local.json'),
			) as unknown as MSWData
			const emails = Object.values(mswOutput.email).reverse() // reverse so we get the most recent email first
			// TODO: add validation
			let email: Email | undefined
			if (typeof recipientOrFilter === 'string') {
				email = emails.find((email: Email) => email.to === recipientOrFilter)
			} else {
				email = emails.find(recipientOrFilter)
			}
			if (email) {
				return email
			}
			// Email not found yet, retry after a delay
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
	const user = await prisma.user.create({
		data: { ...createUser(), ...userOverrides },
	})
	users.add(user)
	return user
}

export async function deleteUserByEmail(email: string) {
	await prisma.user.delete({ where: { email } })
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
	await prisma.user.deleteMany({
		where: { id: { in: [...users].map((u) => u.id) } },
	})
})
