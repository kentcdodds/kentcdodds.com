import { faker } from '@faker-js/faker'
import type * as P from '@prisma/client'

export function createUser(): Omit<P.User, 'id' | 'createdAt' | 'updatedAt'> {
	const gender = faker.helpers.arrayElement(['female', 'male'])
	const firstName = faker.person.firstName(gender as 'female' | 'male')
	const username = faker.internet.userName({ firstName }).toLowerCase()
	return {
		firstName,
		email: `${username}@example.com`,
		convertKitId: null,
		discordId: null,
		role: 'USER',
		team: faker.helpers.arrayElement(['BLUE', 'RED', 'YELLOW']),
	}
}
