import { describe, expect, test } from 'vitest'
import {
	isSemanticSearchConfigured,
	semanticSearchKCD,
} from '../semantic-search.server.ts'

describe('semantic search env gating', () => {
	test('isSemanticSearchConfigured is false without env vars', () => {
		const original = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
		}
		try {
			delete process.env.CLOUDFLARE_ACCOUNT_ID
			delete process.env.CLOUDFLARE_API_TOKEN
			delete process.env.CLOUDFLARE_VECTORIZE_INDEX
			expect(isSemanticSearchConfigured()).toBe(false)
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
		}
	})

	test('semanticSearchKCD throws a helpful error when unconfigured', async () => {
		const original = {
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
			CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
			CLOUDFLARE_VECTORIZE_INDEX: process.env.CLOUDFLARE_VECTORIZE_INDEX,
		}
		try {
			delete process.env.CLOUDFLARE_ACCOUNT_ID
			delete process.env.CLOUDFLARE_API_TOKEN
			delete process.env.CLOUDFLARE_VECTORIZE_INDEX
			await expect(semanticSearchKCD({ query: 'react' })).rejects.toThrow(
				/Semantic search is not configured/i,
			)
		} finally {
			for (const [key, value] of Object.entries(original)) {
				if (typeof value === 'string') process.env[key] = value
				else delete process.env[key]
			}
		}
	})
})

