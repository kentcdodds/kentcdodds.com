import { subMonths } from 'date-fns'
import { query } from '@remix-run/data-table'
import { getPasswordHash } from '#app/utils/password.server.ts'
import { db } from '#app/utils/db.server.ts'
import {
	passwordTable,
	postReadTable,
	userTable,
} from '#app/utils/db/schema.server.ts'

import 'dotenv/config'

async function upsertUserWithPassword({
	email,
	firstName,
	team,
	role,
	passwordHash,
}: {
	email: string
	firstName: string
	team: string
	role?: string
	passwordHash?: string
}) {
	const existing = await db.findOne(userTable, { where: { email } })
	if (existing) {
		if (passwordHash) {
			await db.exec(
				query(passwordTable).upsert(
					{ userId: existing.id, hash: passwordHash },
					{
						conflictTarget: ['userId'],
						update: { hash: passwordHash },
						touch: true,
					},
				),
			)
		}
		return existing
	}

	const user = await db.create(
		userTable,
		{
			email,
			firstName,
			team,
			role: role ?? 'MEMBER',
		},
		{ returnRow: true },
	)

	if (passwordHash) {
		await db.create(passwordTable, {
			userId: user.id,
			hash: passwordHash,
		})
	}

	return user
}

async function main() {
	const kentPasswordHash = await getPasswordHash('iliketwix')

	const kent = await upsertUserWithPassword({
		email: 'me@kentcdodds.com',
		firstName: 'Kent',
		team: 'BLUE',
		role: 'ADMIN',
		passwordHash: kentPasswordHash,
	})

	const hannah = await upsertUserWithPassword({
		email: 'me+hannah@kentcdodds.com',
		firstName: 'Hannah',
		team: 'RED',
	})

	const kody = await upsertUserWithPassword({
		email: 'me+kody@kentcdodds.com',
		firstName: 'Kody',
		team: 'YELLOW',
	})

	const peter = await upsertUserWithPassword({
		email: 'me+peter@kentcdodds.com',
		firstName: 'Peter',
		team: 'YELLOW',
	})

	const postReads = [
		db.create(postReadTable, {
			postSlug: 'super-simple-start-to-remix',
			userId: peter.id,
			createdAt: subMonths(new Date(), 13),
		}),
	]

	for (const [user, reads] of [
		[kent, 6],
		[hannah, 4],
		[kody, 2],
	] as const) {
		for (let index = 0; index < reads; index++) {
			postReads.push(
				db.create(postReadTable, {
					postSlug: 'super-simple-start-to-remix',
					userId: user.id,
				}),
			)
		}
	}

	await Promise.all(postReads)

	console.log('created')
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
