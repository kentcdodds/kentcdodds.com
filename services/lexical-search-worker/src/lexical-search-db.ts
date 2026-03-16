import type { LexicalSearchArtifact } from '../../../other/semantic-search/lexical-search-artifact.ts'
import {
	getLexicalDocId,
	type LexicalSearchAdminOverview,
	type LexicalSearchChunkRecord,
	type LexicalSearchDocDetail,
	type LexicalSearchDocRecord,
	type LexicalSearchMatch,
	type LexicalSearchSourceDetail,
	type LexicalSearchSourceRecord,
	type LexicalSearchStats,
} from '../../../other/semantic-search/lexical-search-service.ts'

const schemaSql = `
	CREATE TABLE IF NOT EXISTS lexical_sources (
		sourceKey TEXT PRIMARY KEY,
		generatedAt TEXT NOT NULL,
		chunkCount INTEGER NOT NULL,
		syncedAt TEXT NOT NULL
	);

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

	CREATE VIRTUAL TABLE IF NOT EXISTS lexical_search_fts USING fts5(
		id UNINDEXED,
		docId UNINDEXED,
		sourceKey UNINDEXED,
		title,
		text,
		tokenize = 'unicode61 remove_diacritics 1'
	);

	CREATE TABLE IF NOT EXISTS service_metadata (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS lexical_docs_source_key_idx
		ON lexical_docs(sourceKey);
	CREATE INDEX IF NOT EXISTS lexical_docs_type_idx
		ON lexical_docs(type);
	CREATE INDEX IF NOT EXISTS lexical_chunks_doc_id_idx
		ON lexical_chunks(docId);
	CREATE INDEX IF NOT EXISTS lexical_chunks_source_key_idx
		ON lexical_chunks(sourceKey);
`

type SourceState = {
	generatedAt: string
	chunkCount: number
}

type SqlRow = Record<string, unknown>

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function chunkRowToRecord(row: SqlRow): LexicalSearchChunkRecord {
	return {
		id: String(row.id),
		docId: String(row.docId),
		sourceKey: String(row.sourceKey),
		type: String(row.type),
		slug: asString(row.slug),
		url: String(row.url),
		title: String(row.title),
		snippet: String(row.snippet),
		text: String(row.text),
		chunkIndex: Number(row.chunkIndex),
		chunkCount: Number(row.chunkCount),
		startSeconds: asNumber(row.startSeconds),
		endSeconds: asNumber(row.endSeconds),
		imageUrl: asString(row.imageUrl),
		imageAlt: asString(row.imageAlt),
		sourceUpdatedAt: asString(row.sourceUpdatedAt),
		transcriptSource: asString(row.transcriptSource),
	}
}

function docRowToRecord(row: SqlRow): LexicalSearchDocRecord {
	return {
		docId: String(row.docId),
		sourceKey: String(row.sourceKey),
		type: String(row.type),
		slug: asString(row.slug),
		url: String(row.url),
		title: String(row.title),
		snippet: String(row.snippet),
		chunkCount: Number(row.chunkCount),
		imageUrl: asString(row.imageUrl),
		imageAlt: asString(row.imageAlt),
		sourceUpdatedAt: asString(row.sourceUpdatedAt),
		transcriptSource: asString(row.transcriptSource),
	}
}

function sourceRowToRecord(row: SqlRow): LexicalSearchSourceRecord {
	return {
		sourceKey: String(row.sourceKey),
		generatedAt: String(row.generatedAt),
		chunkCount: Number(row.chunkCount),
		syncedAt: row.syncedAt === null ? null : String(row.syncedAt),
	}
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
	const docs = new Map<string, LexicalSearchDocRecord>()
	const sortedChunks = [...artifact.chunks].sort((a, b) => {
		const chunkIndexDiff = a.chunkIndex - b.chunkIndex
		if (chunkIndexDiff) return chunkIndexDiff
		return a.id.localeCompare(b.id)
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

function buildLikeQuery(query: string) {
	return `%${query.trim()}%`
}

async function runStatementsInTransaction({
	db,
	statements,
}: {
	db: D1Database
	statements: Array<D1PreparedStatement>
}) {
	for (let i = 0; i < statements.length; i += 100) {
		await db.batch(statements.slice(i, i + 100))
	}
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

async function refreshSourceCounts({
	db,
	sourceKeys,
}: {
	db: D1Database
	sourceKeys: Array<string>
}) {
	if (sourceKeys.length === 0) return
	const statements = sourceKeys.map((sourceKey) =>
		db
			.prepare(
				`
					UPDATE lexical_sources
					SET chunkCount = (
						SELECT COUNT(*)
						FROM lexical_chunks
						WHERE sourceKey = ?
					)
					WHERE sourceKey = ?
				`,
			)
			.bind(sourceKey, sourceKey),
	)
	await db.batch(statements)
}

async function refreshDocCounts({
	db,
	docIds,
}: {
	db: D1Database
	docIds: Array<string>
}) {
	if (docIds.length === 0) return
	const statements = docIds.flatMap((docId) => [
		db
			.prepare(
				`
					UPDATE lexical_docs
					SET chunkCount = (
						SELECT COUNT(*)
						FROM lexical_chunks
						WHERE docId = ?
					)
					WHERE docId = ?
				`,
			)
			.bind(docId, docId),
		db.prepare('DELETE FROM lexical_docs WHERE docId = ? AND chunkCount <= 0').bind(docId),
	])
	await db.batch(statements)
}

export async function ensureLexicalSearchSchema(db: D1Database) {
	await db.exec(schemaSql)
}

export async function getLexicalSearchSourceState({
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

export async function replaceLexicalSearchSource({
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

export async function clearLexicalSearchSource({
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
						c.imageAlt,
						c.sourceUpdatedAt,
						c.transcriptSource
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
			sourceUpdatedAt: asString(row.sourceUpdatedAt),
			transcriptSource: asString(row.transcriptSource),
		}))
	}

	try {
		return await runQuery(matchQuery)
	} catch {
		const fallbackQuery = query
			.split(/\s+/u)
			.map((token) => token.replace(/[^\p{L}\p{N}_-]+/gu, '').trim())
			.filter(Boolean)
			.join(' OR ')
		if (!fallbackQuery) return []
		try {
			return await runQuery(fallbackQuery)
		} catch {
			return []
		}
	}
}

export async function getLexicalSearchStats(db: D1Database) {
	const [sourceRow, docRow, chunkRow, lastSyncedAt] = await Promise.all([
		db.prepare('SELECT COUNT(*) as count FROM lexical_sources').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM lexical_docs').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM lexical_chunks').first<{ count: number }>(),
		getMetadataValue({ db, key: 'lastSyncedAt' }),
	])

	return {
		sourceCount: sourceRow?.count ?? 0,
		docCount: docRow?.count ?? 0,
		chunkCount: chunkRow?.count ?? 0,
		lastSyncedAt,
	} satisfies LexicalSearchStats
}

export async function searchLexicalAdminOverview({
	db,
	query,
	sourceKey,
	type,
	limit,
}: {
	db: D1Database
	query: string
	sourceKey: string
	type: string
	limit: number
}) {
	const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)))
	const normalizedQuery = query.trim()
	const likeQuery = buildLikeQuery(normalizedQuery)
	const [stats, sourceRows, docRows, chunkRows] = await Promise.all([
		getLexicalSearchStats(db),
		db
			.prepare(
				`
					SELECT sourceKey, generatedAt, chunkCount, syncedAt
					FROM lexical_sources
					WHERE (?1 = '' OR sourceKey = ?1)
					ORDER BY sourceKey
					LIMIT ?2
				`,
			)
			.bind(sourceKey, safeLimit)
			.all<SqlRow>(),
		db
			.prepare(
				`
					SELECT
						docId,
						sourceKey,
						type,
						slug,
						url,
						title,
						snippet,
						chunkCount,
						imageUrl,
						imageAlt,
						sourceUpdatedAt,
						transcriptSource
					FROM lexical_docs
					WHERE (?1 = '' OR sourceKey = ?1)
						AND (?2 = '' OR type = ?2)
						AND (
							?3 = ''
							OR docId LIKE ?4
							OR title LIKE ?4
							OR url LIKE ?4
							OR sourceKey LIKE ?4
							OR EXISTS (
								SELECT 1
								FROM lexical_chunks
								WHERE lexical_chunks.docId = lexical_docs.docId
									AND (lexical_chunks.snippet LIKE ?4 OR lexical_chunks.id LIKE ?4)
								LIMIT 1
							)
						)
					ORDER BY type, title, docId
					LIMIT ?5
				`,
			)
			.bind(sourceKey, type, normalizedQuery, likeQuery, safeLimit)
			.all<SqlRow>(),
		db
			.prepare(
				`
					SELECT
						id,
						docId,
						sourceKey,
						type,
						slug,
						url,
						title,
						snippet,
						text,
						chunkIndex,
						chunkCount,
						startSeconds,
						endSeconds,
						imageUrl,
						imageAlt,
						sourceUpdatedAt,
						transcriptSource
					FROM lexical_chunks
					WHERE (?1 = '' OR sourceKey = ?1)
						AND (?2 = '' OR type = ?2)
						AND (
							?3 = ''
							OR id LIKE ?4
							OR docId LIKE ?4
							OR title LIKE ?4
							OR snippet LIKE ?4
						)
					ORDER BY sourceKey, docId, chunkIndex
					LIMIT ?5
				`,
			)
			.bind(sourceKey, type, normalizedQuery, likeQuery, safeLimit)
			.all<SqlRow>(),
	])

	return {
		stats,
		sources: (sourceRows.results ?? []).map(sourceRowToRecord),
		docs: (docRows.results ?? []).map(docRowToRecord),
		chunks: (chunkRows.results ?? []).map(chunkRowToRecord),
		query,
		sourceKey,
		type,
		limit: safeLimit,
	} satisfies LexicalSearchAdminOverview
}

export async function getLexicalSearchSourceDetail({
	db,
	sourceKey,
}: {
	db: D1Database
	sourceKey: string
}) {
	const [sourceRow, docRows] = await Promise.all([
		db
			.prepare(
				`
					SELECT sourceKey, generatedAt, chunkCount, syncedAt
					FROM lexical_sources
					WHERE sourceKey = ?
				`,
			)
			.bind(sourceKey)
			.first<SqlRow>(),
		db
			.prepare(
				`
					SELECT
						docId,
						sourceKey,
						type,
						slug,
						url,
						title,
						snippet,
						chunkCount,
						imageUrl,
						imageAlt,
						sourceUpdatedAt,
						transcriptSource
					FROM lexical_docs
					WHERE sourceKey = ?
					ORDER BY type, title, docId
				`,
			)
			.bind(sourceKey)
			.all<SqlRow>(),
	])

	return {
		source: sourceRow ? sourceRowToRecord(sourceRow) : null,
		docs: (docRows.results ?? []).map(docRowToRecord),
	} satisfies LexicalSearchSourceDetail
}

export async function getLexicalSearchDocDetail({
	db,
	docId,
}: {
	db: D1Database
	docId: string
}) {
	const [docRow, chunkRows] = await Promise.all([
		db
			.prepare(
				`
					SELECT
						docId,
						sourceKey,
						type,
						slug,
						url,
						title,
						snippet,
						chunkCount,
						imageUrl,
						imageAlt,
						sourceUpdatedAt,
						transcriptSource
					FROM lexical_docs
					WHERE docId = ?
				`,
			)
			.bind(docId)
			.first<SqlRow>(),
		db
			.prepare(
				`
					SELECT
						id,
						docId,
						sourceKey,
						type,
						slug,
						url,
						title,
						snippet,
						text,
						chunkIndex,
						chunkCount,
						startSeconds,
						endSeconds,
						imageUrl,
						imageAlt,
						sourceUpdatedAt,
						transcriptSource
					FROM lexical_chunks
					WHERE docId = ?
					ORDER BY chunkIndex, id
				`,
			)
			.bind(docId)
			.all<SqlRow>(),
	])

	return {
		doc: docRow ? docRowToRecord(docRow) : null,
		chunks: (chunkRows.results ?? []).map(chunkRowToRecord),
	} satisfies LexicalSearchDocDetail
}

export async function getLexicalSearchChunkDetail({
	db,
	chunkId,
}: {
	db: D1Database
	chunkId: string
}) {
	const row = await db
		.prepare(
			`
				SELECT
					id,
					docId,
					sourceKey,
					type,
					slug,
					url,
					title,
					snippet,
					text,
					chunkIndex,
					chunkCount,
					startSeconds,
					endSeconds,
					imageUrl,
					imageAlt,
					sourceUpdatedAt,
					transcriptSource
				FROM lexical_chunks
				WHERE id = ?
			`,
		)
		.bind(chunkId)
		.first<SqlRow>()

	return row ? chunkRowToRecord(row) : null
}

export async function deleteLexicalSearchSource({
	db,
	sourceKey,
}: {
	db: D1Database
	sourceKey: string
}) {
	await clearLexicalSearchSource({ db, sourceKey })
}

export async function deleteLexicalSearchDoc({
	db,
	docId,
}: {
	db: D1Database
	docId: string
}) {
	const sourceRows = await db
		.prepare('SELECT DISTINCT sourceKey FROM lexical_chunks WHERE docId = ?')
		.bind(docId)
		.all<{ sourceKey: string }>()

	await runStatementsInTransaction({
		db,
		statements: [
			db.prepare('DELETE FROM lexical_search_fts WHERE docId = ?').bind(docId),
			db.prepare('DELETE FROM lexical_chunks WHERE docId = ?').bind(docId),
			db.prepare('DELETE FROM lexical_docs WHERE docId = ?').bind(docId),
		],
	})

	await refreshSourceCounts({
		db,
		sourceKeys: (sourceRows.results ?? []).map((row) => row.sourceKey),
	})
}

export async function deleteLexicalSearchChunk({
	db,
	chunkId,
}: {
	db: D1Database
	chunkId: string
}) {
	const row = await db
		.prepare('SELECT docId, sourceKey FROM lexical_chunks WHERE id = ?')
		.bind(chunkId)
		.first<{ docId: string; sourceKey: string }>()
	if (!row) return

	await runStatementsInTransaction({
		db,
		statements: [
			db.prepare('DELETE FROM lexical_search_fts WHERE id = ?').bind(chunkId),
			db.prepare('DELETE FROM lexical_chunks WHERE id = ?').bind(chunkId),
		],
	})

	await refreshDocCounts({ db, docIds: [row.docId] })
	await refreshSourceCounts({ db, sourceKeys: [row.sourceKey] })
}

export async function markLexicalSearchSynced({
	db,
	syncedAt,
}: {
	db: D1Database
	syncedAt: string
}) {
	await setMetadataValue({ db, key: 'lastSyncedAt', value: syncedAt })
}
