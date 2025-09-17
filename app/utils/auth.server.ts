import crypto from 'node:crypto'
import { type Password, type User } from '@prisma/client'
import bcrypt from 'bcrypt'
import { redirect } from '@remix-run/node'
import { createSession, prisma } from './prisma.server.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'email'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: { id: true, password: { select: { hash: true } } },
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return { id: userWithPassword.id }
}

export function getPasswordHashParts(password: string) {
	const hash = crypto
		.createHash('sha1')
		.update(password, 'utf8')
		.digest('hex')
		.toUpperCase()
	return [hash.slice(0, 5), hash.slice(5)] as const
}

export async function checkIsCommonPassword(password: string) {
	const [prefix, suffix] = getPasswordHashParts(password)

	try {
		const response = await fetch(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			{ signal: AbortSignal.timeout(1000) },
		)

		if (!response.ok) return false

		const data = await response.text()
		return data.split(/\r?\n/).some((line) => {
			const [hashSuffix, ignoredPrevalenceCount] = line.split(':')
			return hashSuffix === suffix
		})
	} catch (error) {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			console.warn('Password check timed out')
			return false
		}

		console.warn('Unknown error during password check', error)
		return false
	}
}

export async function signup({
	email,
	password,
	firstName,
	team,
}: {
	email: User['email']
	password: string
	firstName: User['firstName']
	team: User['team']
}) {
	const hashedPassword = await getPasswordHash(password)

	const user = await prisma.user.create({
		data: {
			email: email.toLowerCase(),
			firstName,
			team,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
		},
		select: { id: true },
	})

	const session = await createSession({ userId: user.id })
	return { user, session }
}

export async function loginWithPassword({
	email,
	password,
}: {
	email: string
	password: string
}) {
	const user = await verifyUserPassword({ email }, password)
	if (!user) {
		return null
	}

	const session = await createSession({ userId: user.id })
	return { user, session }
}