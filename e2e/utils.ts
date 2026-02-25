import { invariant } from '@epic-web/invariant'
import { test as base } from '@playwright/test'
import { parse } from 'cookie'
import { type User } from '#app/utils/prisma-generated.server/client.ts'
import { prisma } from '#app/utils/prisma.server.ts'
import { getSession } from '../app/utils/session.server.ts'
import { createUser } from '../prisma/seed-utils.ts'

type Email = {
	id?: number
	to: string
	from: string
	subject: string
	text: string
	html: string
	verificationCode?: string | null
	verificationUrl?: string | null
}

type MockMailgunResponse = {
	emails: Array<Email>
}

type MockMailgunLatestResponse = {
	email: Email
}

async function getMockMailgunEmails() {
	const mailgunBaseUrl = getLocalMailgunBaseUrl()
	if (!mailgunBaseUrl) return null
	const url = new URL('/__mocks/emails', mailgunBaseUrl)
	try {
		const response = await fetch(url)
		if (!response.ok) return null
		const payload = (await response.json()) as MockMailgunResponse
		return payload.emails
	} catch {
		return null
	}
}

async function getMockMailgunLatestEmail({
	to,
}: {
	to: string
}) {
	const mailgunBaseUrl = getLocalMailgunBaseUrl()
	if (!mailgunBaseUrl) return null
	const url = new URL('/__mocks/emails/latest', mailgunBaseUrl)
	url.searchParams.set('to', to)
	try {
		const response = await fetch(url)
		if (!response.ok) return null
		const payload = (await response.json()) as MockMailgunLatestResponse
		return payload.email
	} catch {
		return null
	}
}

async function resetMockMailgunEmails() {
	const mailgunBaseUrl = getLocalMailgunBaseUrl()
	if (!mailgunBaseUrl) return
	const url = new URL('/__mocks/reset', mailgunBaseUrl)
	try {
		await fetch(url, { method: 'POST' })
	} catch {
		// best effort
	}
}

function getLocalMailgunBaseUrl() {
	const configuredBaseUrl = process.env.MAILGUN_API_BASE_URL?.trim()
	if (configuredBaseUrl?.startsWith('http://127.0.0.1')) {
		return configuredBaseUrl
	}
	if (configuredBaseUrl?.startsWith('http://localhost')) {
		return configuredBaseUrl.replace('http://localhost', 'http://127.0.0.1')
	}
	if (process.env.PLAYWRIGHT_TEST_BASE_URL?.startsWith('http://localhost')) {
		return 'http://127.0.0.1:8793'
	}
	return null
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
			const mockEmails = await getMockMailgunEmails()
			if (typeof recipientOrFilter === 'string') {
				const latestEmail = await getMockMailgunLatestEmail({
					to: recipientOrFilter,
				})
				if (latestEmail) return latestEmail
			}
			if (mockEmails) {
				const emails = [...mockEmails]
				let email: Email | undefined
				if (typeof recipientOrFilter === 'string') {
					email = emails.find((entry) => entry.to === recipientOrFilter)
				} else {
					email = emails.find(recipientOrFilter)
				}
				if (email) {
					return email
				}
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
	await resetMockMailgunEmails()
})
