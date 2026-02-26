import { remember } from '@epic-web/remember'

type LocalMdxRemoteKvBinding = {
	get(key: string, type?: 'text'): Promise<string | null>
	put(key: string, value: string): Promise<void>
	delete(key: string): Promise<void>
}

export const getLocalMdxRemoteKvBinding = remember(
	'local-mdx-remote-kv',
	createLocalMdxRemoteKvBinding,
)

function createLocalMdxRemoteKvBinding(): LocalMdxRemoteKvBinding {
	const values = new Map<string, string>()
	return {
		async get(key) {
			return values.get(key) ?? null
		},
		async put(key, value) {
			values.set(key, value)
		},
		async delete(key) {
			values.delete(key)
		},
	}
}
