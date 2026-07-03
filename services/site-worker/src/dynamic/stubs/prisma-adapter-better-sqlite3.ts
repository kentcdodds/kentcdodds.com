function unavailable(): never {
	throw new Error(
		'@prisma/adapter-better-sqlite3 is not available in the Cloudflare Workers runtime',
	)
}

export class PrismaBetterSqlite3 {
	constructor() {
		unavailable()
	}
}
