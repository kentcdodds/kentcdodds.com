export function setEnv(overrides: Record<string, string | undefined>) {
	const env = process.env as Record<string, string | undefined>
	const previous = new Map<string, string | undefined>()

	for (const [key, value] of Object.entries(overrides)) {
		previous.set(key, env[key])
		if (value === undefined) {
			delete env[key]
		} else {
			env[key] = value
		}
	}

	return {
		[Symbol.dispose]() {
			for (const [key, value] of previous.entries()) {
				if (value === undefined) {
					delete env[key]
				} else {
					env[key] = value
				}
			}
		},
	}
}
