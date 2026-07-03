function unavailable(method: string): never {
	throw new Error(
		`better-sqlite3 is not available in the Cloudflare Workers runtime (${method})`,
	)
}

export default class Database {
	constructor() {
		unavailable('constructor')
	}
}

export class BetterSqlite3Adapter {
	constructor() {
		unavailable('PrismaBetterSqlite3')
	}
}
