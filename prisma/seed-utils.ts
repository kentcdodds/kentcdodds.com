import { faker } from '@faker-js/faker'
import type * as P from '#app/utils/prisma-generated.server/client.ts'

export function createUser(): Omit<P.User, 'id' | 'createdAt' | 'updatedAt'> {
	const gender = faker.helpers.arrayElement(['female', 'male'])
	const firstName = faker.person.firstName(gender as 'female' | 'male')
	const username = faker.internet.userName({ firstName }).toLowerCase()
	return {
		firstName,
		email: `${username}@example.com`,
		kitId: null,
		discordId: null,
		role: 'USER',
		team: faker.helpers.arrayElement(['BLUE', 'RED', 'YELLOW']),
	}
}
