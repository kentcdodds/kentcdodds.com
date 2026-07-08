export class DatabaseSync {
	constructor() {
		throw new Error(
			'node:sqlite is not available in the worker dev runtime; use APP_DB (local D1) instead',
		)
	}
}

export default { DatabaseSync }
