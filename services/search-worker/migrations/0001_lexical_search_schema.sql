-- Lexical search: source bookkeeping, doc metadata, chunks, FTS5, indexes.
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
