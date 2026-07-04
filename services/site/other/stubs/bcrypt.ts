import bcryptjs from 'bcryptjs'

export async function hash(password: string, rounds: number) {
	return bcryptjs.hash(password, rounds)
}

export async function compare(password: string, hash: string) {
	return bcryptjs.compare(password, hash)
}

export async function genSalt(rounds: number) {
	return bcryptjs.genSalt(rounds)
}

export default {
	hash,
	compare,
	genSalt,
}
