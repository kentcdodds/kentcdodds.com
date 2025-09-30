import crypto from 'node:crypto'
import { type Password, type User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcrypt'
import { createSession, prisma } from './prisma.server.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	password: string,
	hash: string,
) {
	const isValid = await bcrypt.compare(password, hash)
	return isValid
}

export async function loginWithPassword({
	email,
	password,
}: {
	email: string
	password: string
}) {
	const user = await prisma.user.findUnique({
		where: { email },
		include: { password: { select: { hash: true } } },
	})

	if (!user || !user.password) {
		return null
	}

	const isValid = await verifyUserPassword(password, user.password.hash)
	if (!isValid) {
		return null
	}

	return { user: { id: user.id, email: user.email, firstName: user.firstName } }
}

export async function getUserById(id: string) {
	const user = await prisma.user.findUnique({
		where: { id },
		select: { id: true, email: true, firstName: true, team: true },
	})
	return user
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
		// Use AbortController with setTimeout for compatibility
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 1000)
		
		const response = await fetch(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			{ signal: controller.signal },
		)
		
		clearTimeout(timeoutId)

		if (!response.ok) return false

		const data = await response.text()
		return data.split(/\r?\n/).some((line) => {
			const [hashSuffix, ignoredPrevalenceCount] = line.split(':')
			return hashSuffix === suffix
		})
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			console.warn('Password check timed out')
			return false
		}

		console.warn('Unknown error during password check', error)
		return false
	}
}

export async function signupWithPassword({
	email,
	password,
	firstName,
	lastName,
}: {
	email: string
	password: string
	firstName: string
	lastName?: string
}) {
	// Check if user already exists
	const existingUser = await prisma.user.findUnique({
		where: { email: email.toLowerCase() },
	})
	
	if (existingUser) {
		return null
	}

	const hashedPassword = await getPasswordHash(password)

	const user = await prisma.user.create({
		data: {
			email: email.toLowerCase(),
			firstName,
			...(lastName && { lastName }),
		},
		select: { id: true, email: true, firstName: true },
	})

	// Create password separately
	await prisma.password.create({
		data: {
			userId: user.id,
			hash: hashedPassword,
		},
	})

	return { user }
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
		},
		select: { id: true, email: true, firstName: true, team: true },
	})

	// Create password separately
	await prisma.password.create({
		data: {
			userId: user.id,
			hash: hashedPassword,
		},
	})

	return { user }
}

export async function createPasswordForUser({
	userId,
	password,
}: {
	userId: string
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	
	await prisma.password.create({
		data: {
			userId,
			hash: hashedPassword,
		},
	})
}