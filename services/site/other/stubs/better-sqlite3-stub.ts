export default class BetterSqlite3Stub {
	constructor() {
		throw new Error(
			'better-sqlite3 is not available in the worker dev runtime; use APP_DB (local D1) instead',
		)
	}
}
