import { type User } from '#app/utils/prisma-generated.server/client.ts'

export type AppRole = 'ADMIN' | 'MEMBER'

export function normalizeRole(role: string | null | undefined): AppRole {
	return role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
}

export function isUserAdmin(
	user: Pick<User, 'role'> | null | undefined,
): boolean {
	return normalizeRole(user?.role) === 'ADMIN'
}
