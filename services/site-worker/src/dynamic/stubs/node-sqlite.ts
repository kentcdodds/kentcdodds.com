function unavailable(method: string): never {
	throw new Error(
		`node:sqlite is not available in the Cloudflare Workers runtime (${method}); use APP_DB (D1) instead`,
	)
}

export class DatabaseSync {
	constructor() {
		unavailable('DatabaseSync constructor')
	}
}

export default { DatabaseSync }
