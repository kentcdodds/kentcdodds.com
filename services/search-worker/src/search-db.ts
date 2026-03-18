import {
	getLexicalDocId,
	type LexicalSearchArtifact,
} from '@kcd-internal/search-shared'
import { sql } from './d1-sql.ts'
import { writeDebugLog } from './debug-log'

/** Lexical FTS row shape returned by {@link queryLexicalSearch}. */
type LexicalSearchMatch = {
	id: string
	type?: string
	slug?: string
	title?: string
	url?: string
	snippet?: string
	chunkIndex?: number
	chunkCount?: number
	startSeconds?: number
	endSeconds?: number
	imageUrl?: string
	imageAlt?: string
}

const searchSchemaDdl: string[] = [
	sql`
		CREATE TABLE IF NOT EXISTS lexical_sources (
			sourceKey TEXT PRIMARY KEY,
			generatedAt TEXT NOT NULL,
			chunkCount INTEGER NOT NULL,
			syncedAt TEXT NOT NULL
		);
	`,
	sql`
		CREATE TABLE IF NOT EXISTS lexical_docs (
			docId TEXT PRIMARY KEY,
			sourceKey TEXT NOT NULL,
			type TEXT NOT NULL,
			slug TEXT,
			url TEXT NOT NULL,
			title TEXT NOT NULL,
			snippet TEXT NOT NULL,
			chunkCount INTEGER NOT NULL,
			imageUrl TEXT,
			imageAlt TEXT,
			sourceUpdatedAt TEXT,
			transcriptSource TEXT
		);
	`,
	sql`
		CREATE TABLE IF NOT EXISTS lexical_chunks (
			id TEXT PRIMARY KEY,
			docId TEXT NOT NULL,
			sourceKey TEXT NOT NULL,
			type TEXT NOT NULL,
			slug TEXT,
			url TEXT NOT NULL,
			title TEXT NOT NULL,
			snippet TEXT NOT NULL,
			text TEXT NOT NULL,
			chunkIndex INTEGER NOT NULL,
			chunkCount INTEGER NOT NULL,
			startSeconds INTEGER,
			endSeconds INTEGER,
			imageUrl TEXT,
			imageAlt TEXT,
			sourceUpdatedAt TEXT,
			transcriptSource TEXT
		);
	`,
	sql`
		CREATE VIRTUAL TABLE IF NOT EXISTS lexical_search_fts USING fts5(
			id UNINDEXED,
			docId UNINDEXED,
			sourceKey UNINDEXED,
			title,
			text,
			tokenize = 'unicode61 remove_diacritics 1'
		);
	`,
	sql`
		CREATE TABLE IF NOT EXISTS service_metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`,
	sql`
		CREATE INDEX IF NOT EXISTS lexical_docs_source_key_idx
			ON lexical_docs(sourceKey);
	`,
	sql`
		CREATE INDEX IF NOT EXISTS lexical_docs_type_idx
			ON lexical_docs(type);
	`,
	sql`
		CREATE INDEX IF NOT EXISTS lexical_chunks_doc_id_idx
			ON lexical_chunks(docId);
	`,
	sql`
		CREATE INDEX IF NOT EXISTS lexical_chunks_source_key_idx
			ON lexical_chunks(sourceKey);
	`,
]

type SourceState = {
	generatedAt: string
	chunkCount: number
}

type SqlRow = Record<string, unknown>

type LexicalDocRecord = {
	docId: string
	sourceKey: string
	type: string
	slug?: string
	url: string
	title: string
	snippet: string
	chunkCount: number
	imageUrl?: string
	imageAlt?: string
	sourceUpdatedAt?: string
	transcriptSource?: string
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function buildLexicalSearchMatchQuery(query: string) {
	const terms: string[] = []
	for (const match of query.matchAll(/"([^"]+)"|([\p{L}\p{N}_-]+)/gu)) {
		const phrase = match[1]?.trim()
		if (phrase) {
			terms.push(`"${phrase.replace(/"/g, '""')}"`)
			continue
		}

		const token = match[2]?.trim()
		if (token) terms.push(token)
	}

	// #region agent log
	writeDebugLog({
		hypothesisId: 'B',
		location: 'services/search-worker/src/search-db.ts:buildLexicalSearchMatchQuery',
		message: 'Built lexical search match query',
		data: {
			query,
			terms,
			matchQuery: terms.length ? terms.join(' OR ') : null,
			termCount: terms.length,
		},
	})
	// #endregion
	if (!terms.length) return null
	return terms.join(' OR ')
}

function buildDocRecords({
	sourceKey,
	artifact,
}: {
	sourceKey: string
	artifact: LexicalSearchArtifact
}) {
	const docs = new Map<string, LexicalDocRecord>()
	const sortedChunks = [...artifact.chunks].sort((left, right) => {
		const chunkIndexDiff = left.chunkIndex - right.chunkIndex
		if (chunkIndexDiff) return chunkIndexDiff
		return left.id.localeCompare(right.id)
	})

	for (const chunk of sortedChunks) {
		const docId = getLexicalDocId({
			chunkId: chunk.id,
			type: chunk.type,
			slug: chunk.slug,
			url: chunk.url,
			title: chunk.title,
		})
		const existing = docs.get(docId)
		if (existing) {
			existing.chunkCount += 1
			continue
		}

		docs.set(docId, {
			docId,
			sourceKey,
			type: chunk.type,
			slug: chunk.slug,
			url: chunk.url,
			title: chunk.title,
			snippet: chunk.snippet,
			chunkCount: 1,
			imageUrl: chunk.imageUrl,
			imageAlt: chunk.imageAlt,
			sourceUpdatedAt: chunk.sourceUpdatedAt,
			transcriptSource: chunk.transcriptSource,
		})
	}

	return docs
}

function isFtsQuerySyntaxError(error: unknown) {
	if (!(error instanceof Error)) return false
	return /fts5|syntax error|malformed match|unterminated/i.test(error.message)
}

async function runStatementsInTransaction({
	db,
	statements,
}: {
	db: D1Database
	statements: Array<D1PreparedStatement>
}) {
	if (statements.length === 0) return
	// D1 batch() runs all statements atomically (implicit transaction), not BEGIN/COMMIT.
	await db.batch(statements)
}

async function setMetadataValue({
	db,
	key,
	value,
}: {
	db: D1Database
	key: string
	value: string
}) {
	await db
		.prepare(
			'INSERT OR REPLACE INTO service_metadata (key, value) VALUES (?, ?)',
		)
		.bind(key, value)
		.run()
}

async function getMetadataValue({
	db,
	key,
}: {
	db: D1Database
	key: string
}) {
	const row = await db
		.prepare('SELECT value FROM service_metadata WHERE key = ?')
		.bind(key)
		.first<{ value: string }>()
	return row?.value ?? null
}

export async function ensureSearchSchema(db: D1Database) {
	for (const statement of searchSchemaDdl) {
		await db.exec(statement)
	}
}

export async function getSearchSourceState({
	db,
	sourceKey,
}: {
	db: D1Database
	sourceKey: string
}) {
	const row = await db
		.prepare(
			'SELECT generatedAt, chunkCount FROM lexical_sources WHERE sourceKey = ?',
		)
		.bind(sourceKey)
		.first<SourceState>()
	return row ?? null
}

export async function replaceSearchSource({
	db,
	sourceKey,
	artifact,
	syncedAt,
}: {
	db: D1Database
	sourceKey: string
	artifact: LexicalSearchArtifact
	syncedAt: string
}) {
	const docs = buildDocRecords({ sourceKey, artifact })
	const statements: Array<D1PreparedStatement> = [
		db.prepare('DELETE FROM lexical_search_fts WHERE sourceKey = ?').bind(sourceKey),
		db.prepare('DELETE FROM lexical_chunks WHERE sourceKey = ?').bind(sourceKey),
		db.prepare('DELETE FROM lexical_docs WHERE sourceKey = ?').bind(sourceKey),
		db.prepare('DELETE FROM lexical_sources WHERE sourceKey = ?').bind(sourceKey),
		db
			.prepare(
				`
					INSERT INTO lexical_sources (sourceKey, generatedAt, chunkCount, syncedAt)
					VALUES (?, ?, ?, ?)
				`,
			)
			.bind(sourceKey, artifact.generatedAt, artifact.chunks.length, syncedAt),
	]

	for (const doc of docs.values()) {
		statements.push(
			db
				.prepare(
					`
						INSERT INTO lexical_docs (
							docId, sourceKey, type, slug, url, title, snippet, chunkCount,
							imageUrl, imageAlt, sourceUpdatedAt, transcriptSource
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
				)
				.bind(
					doc.docId,
					doc.sourceKey,
					doc.type,
					doc.slug ?? null,
					doc.url,
					doc.title,
					doc.snippet,
					doc.chunkCount,
					doc.imageUrl ?? null,
					doc.imageAlt ?? null,
					doc.sourceUpdatedAt ?? null,
					doc.transcriptSource ?? null,
				),
		)
	}

	for (const chunk of artifact.chunks) {
		const docId = getLexicalDocId({
			chunkId: chunk.id,
			type: chunk.type,
			slug: chunk.slug,
			url: chunk.url,
			title: chunk.title,
		})
		statements.push(
			db
				.prepare(
					`
						INSERT INTO lexical_chunks (
							id, docId, sourceKey, type, slug, url, title, snippet, text,
							chunkIndex, chunkCount, startSeconds, endSeconds, imageUrl,
							imageAlt, sourceUpdatedAt, transcriptSource
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
				)
				.bind(
					chunk.id,
					docId,
					sourceKey,
					chunk.type,
					chunk.slug ?? null,
					chunk.url,
					chunk.title,
					chunk.snippet,
					chunk.text,
					chunk.chunkIndex,
					chunk.chunkCount,
					chunk.startSeconds ?? null,
					chunk.endSeconds ?? null,
					chunk.imageUrl ?? null,
					chunk.imageAlt ?? null,
					chunk.sourceUpdatedAt ?? null,
					chunk.transcriptSource ?? null,
				),
			db
				.prepare(
					`
						INSERT INTO lexical_search_fts (id, docId, sourceKey, title, text)
						VALUES (?, ?, ?, ?, ?)
					`,
				)
				.bind(chunk.id, docId, sourceKey, chunk.title, chunk.text),
		)
	}

	await runStatementsInTransaction({ db, statements })
}

export async function clearSearchSource({
	db,
	sourceKey,
}: {
	db: D1Database
	sourceKey: string
}) {
	await runStatementsInTransaction({
		db,
		statements: [
			db.prepare('DELETE FROM lexical_search_fts WHERE sourceKey = ?').bind(sourceKey),
			db.prepare('DELETE FROM lexical_chunks WHERE sourceKey = ?').bind(sourceKey),
			db.prepare('DELETE FROM lexical_docs WHERE sourceKey = ?').bind(sourceKey),
			db.prepare('DELETE FROM lexical_sources WHERE sourceKey = ?').bind(sourceKey),
		],
	})
}

export async function queryLexicalSearch({
	db,
	query,
	topK,
}: {
	db: D1Database
	query: string
	topK: number
}) {
	const matchQuery = buildLexicalSearchMatchQuery(query)
	if (!matchQuery) return [] as Array<LexicalSearchMatch>

	const runQuery = async (candidateQuery: string) => {
		// #region agent log
		writeDebugLog({
			hypothesisId: 'C',
			location: 'services/search-worker/src/search-db.ts:runQuery',
			message: 'Executing lexical search query',
			data: {
				candidateQuery,
				topK,
			},
		})
		// #endregion
		try {
			const result = await db
				.prepare(
					`
						SELECT
							c.id,
							c.type,
							c.slug,
							c.url,
							c.title,
							c.snippet,
							c.chunkIndex,
							c.chunkCount,
							c.startSeconds,
							c.endSeconds,
							c.imageUrl,
							c.imageAlt
						FROM lexical_search_fts f
						JOIN lexical_chunks c ON c.id = f.id
						WHERE lexical_search_fts MATCH ?
						ORDER BY bm25(lexical_search_fts, 10.0, 1.0), c.chunkIndex
						LIMIT ?
					`,
				)
				.bind(candidateQuery, topK)
				.all<SqlRow>()

			return (result.results ?? []).map((row) => ({
				id: String(row.id),
				type: asString(row.type),
				slug: asString(row.slug),
				title: asString(row.title),
				url: asString(row.url),
				snippet: asString(row.snippet),
				chunkIndex: asNumber(row.chunkIndex),
				chunkCount: asNumber(row.chunkCount),
				startSeconds: asNumber(row.startSeconds),
				endSeconds: asNumber(row.endSeconds),
				imageUrl: asString(row.imageUrl),
				imageAlt: asString(row.imageAlt),
			}))
		} catch (error) {
			// #region agent log
			writeDebugLog({
				hypothesisId: 'C',
				location: 'services/search-worker/src/search-db.ts:runQuery:catch',
				message: 'Lexical search query failed',
				data: {
					candidateQuery,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			})
			// #endregion
			throw error
		}
	}

	try {
		return await runQuery(matchQuery)
	} catch (error) {
		if (!isFtsQuerySyntaxError(error)) throw error

		const fallbackQuery = query
			.split(/\s+/u)
			.map((token) => token.replace(/[^\p{L}\p{N}_-]+/gu, '').trim())
			.filter(Boolean)
			.join(' OR ')
		// #region agent log
		writeDebugLog({
			hypothesisId: 'D',
			location: 'services/search-worker/src/search-db.ts:queryLexicalSearch:catch',
			message: 'Retrying lexical search with fallback query',
			data: {
				query,
				matchQuery,
				fallbackQuery: fallbackQuery || null,
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		})
		// #endregion
		if (!fallbackQuery) return []

		return await runQuery(fallbackQuery)
	}
}

export async function markSearchSynced({
	db,
	syncedAt,
}: {
	db: D1Database
	syncedAt: string
}) {
	await setMetadataValue({ db, key: 'lastSyncedAt', value: syncedAt })
}

export async function getSearchSyncedAt(db: D1Database) {
	return await getMetadataValue({ db, key: 'lastSyncedAt' })
}
