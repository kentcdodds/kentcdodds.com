#!/usr/bin/env node
/**
 * Inflates a seeded local SQLite DB with realistic volume for migration testing.
 * Run after applying SQL migrations to a fresh SQLite database.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getDefaultSqliteDbPath } from '../../site/scripts/lib/apply-sql-migrations.mjs'

const TARGET_USERS = 500
const TARGET_SESSIONS = 200
const TARGET_POST_READS = 50_000
const TARGET_FAVORITES = 800
const TARGET_HOMEWORK = 400
const TARGET_CALLS = 12
const TARGET_VERIFICATIONS = 30

const defaultDbPath = getDefaultSqliteDbPath()

function parseArgs(argv) {
	const options = { dbPath: defaultDbPath }
	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index]
		if (arg === '--db') {
			options.dbPath = path.resolve(argv[++index])
		} else if (arg === '--help' || arg === '-h') {
			options.help = true
		}
	}
	return options
}

function isoNow(offsetMs = 0) {
	return new Date(Date.now() + offsetMs).toISOString()
}

function insertMany(db, sql, rows) {
	const statement = db.prepare(sql)
	db.exec('BEGIN')
	try {
		for (const row of rows) statement.run(...row)
		db.exec('COMMIT')
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}

function main() {
	const options = parseArgs(process.argv)
	if (options.help) {
		console.log('Usage: migrate-build-fixture.mjs [--db <sqlite.db>]')
		return
	}

	const db = new DatabaseSync(options.dbPath)
	db.exec('PRAGMA journal_mode = WAL')

	const existingUsers = db.prepare('SELECT COUNT(*) AS c FROM "User"').get().c
	const usersToAdd = Math.max(0, TARGET_USERS - existingUsers)
	const userIds = db
		.prepare('SELECT id FROM "User"')
		.all()
		.map((row) => row.id)

	console.log(`Inflating ${options.dbPath} (existing users: ${existingUsers})`)

	const newUserRows = []
	for (let index = 0; index < usersToAdd; index += 1) {
		const id = randomUUID()
		const now = isoNow(-index * 60_000)
		newUserRows.push([
			id,
			now,
			now,
			`fixture-user-${index}@example.com`,
			`Fixture${index}`,
			null,
			null,
			'MEMBER',
			index % 2 === 0 ? 'BLUE' : 'RED',
		])
		userIds.push(newUserRows[index][0])
	}

	if (newUserRows.length > 0) {
		insertMany(
			db,
			`INSERT INTO "User" (id, createdAt, updatedAt, email, firstName, discordId, kitId, role, team)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			newUserRows,
		)
	}

	const passwordRows = newUserRows.map((row) => [
		'$2a$10$fixturehashfixturehashfixtureha',
		row[1],
		row[2],
		row[0],
	])
	if (passwordRows.length > 0) {
		insertMany(
			db,
			`INSERT INTO "Password" (hash, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?)`,
			passwordRows,
		)
	}

	const passkeyRows = userIds.slice(0, 40).map((userId, index) => {
		const now = isoNow(-index * 120_000)
		return [
			randomUUID(),
			randomUUID(),
			now,
			now,
			randomBytes(64),
			userId,
			randomUUID(),
			BigInt(index + 1),
			index % 2 === 0 ? 'singleDevice' : 'multiDevice',
			index % 3 === 0 ? 1 : 0,
			'internal',
		]
	})
	insertMany(
		db,
		`INSERT INTO "Passkey" (id, aaguid, createdAt, updatedAt, publicKey, userId, webauthnUserId, counter, deviceType, backedUp, transports)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		passkeyRows,
	)

	const sessionRows = []
	for (let index = 0; index < TARGET_SESSIONS; index += 1) {
		const userId = userIds[index % userIds.length]
		sessionRows.push([
			randomUUID(),
			isoNow(-index * 30_000),
			userId,
			isoNow(index * 86_400_000),
		])
	}
	insertMany(
		db,
		`INSERT INTO "Session" (id, createdAt, userId, expirationDate) VALUES (?, ?, ?, ?)`,
		sessionRows,
	)

	const verificationRows = []
	for (let index = 0; index < TARGET_VERIFICATIONS; index += 1) {
		verificationRows.push([
			randomUUID(),
			isoNow(-index * 45_000),
			index % 2 === 0 ? '2fa' : 'reset',
			`target-${index}@example.com`,
			randomBytes(16).toString('hex'),
			isoNow(3_600_000 + index * 1000),
		])
	}
	insertMany(
		db,
		`INSERT INTO "Verification" (id, createdAt, type, target, codeHash, expiresAt) VALUES (?, ?, ?, ?, ?, ?)`,
		verificationRows,
	)

	const callRows = []
	const callIds = []
	for (let index = 0; index < TARGET_CALLS; index += 1) {
		const id = randomUUID()
		callIds.push(id)
		const userId = userIds[index % userIds.length]
		const now = isoNow(-index * 300_000)
		callRows.push([
			id,
			now,
			now,
			`Fixture call ${index}`,
			index % 2 === 0 ? 'Notes with a newline\nand a quote: O\'Reilly' : null,
			index % 3 === 0 ? 1 : 0,
			null,
			'NOT_STARTED',
			null,
			userId,
			`calls/${id}.webm`,
			'audio/webm',
			1024 + index,
		])
	}
	insertMany(
		db,
		`INSERT INTO "Call" (id, createdAt, updatedAt, title, notes, isAnonymous, callerTranscript, callerTranscriptStatus, callerTranscriptErrorMessage, userId, audioKey, audioContentType, audioSize)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		callRows,
	)

	const draftRows = callIds.map((callId, index) => {
		const now = isoNow(-index * 310_000)
		return [
			randomUUID(),
			now,
			now,
			index % 4 === 0 ? 'READY' : 'PROCESSING',
			'DONE',
			null,
			`drafts/${callId}.mp3`,
			'audio/mpeg',
			2048,
			null,
			null,
			null,
			null,
			null,
			`Transcript line ${index}`,
			`Draft title ${index}`,
			`Description ${index}`,
			'fixture,test',
			callId,
		]
	})
	insertMany(
		db,
		`INSERT INTO "CallKentEpisodeDraft" (id, createdAt, updatedAt, status, step, errorMessage, episodeAudioKey, episodeAudioContentType, episodeAudioSize, responseAudioKey, responseAudioContentType, responseAudioSize, callerSegmentAudioKey, responseSegmentAudioKey, transcript, title, description, keywords, callId)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		draftRows,
	)

	const callerEpisodeRows = callIds.slice(0, 6).map((_, index) => {
		const now = isoNow(-index * 320_000)
		return [
			randomUUID(),
			now,
			now,
			userIds[index % userIds.length],
			`Caller episode ${index}`,
			`Caller notes ${index}`,
			index % 2 === 0 ? 1 : 0,
			`transistor-${randomUUID()}`,
		]
	})
	insertMany(
		db,
		`INSERT INTO "CallKentCallerEpisode" (id, createdAt, updatedAt, userId, callTitle, callNotes, isAnonymous, transistorEpisodeId)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		callerEpisodeRows,
	)

	const slugs = [
		'fix-your-finishing',
		'how-to-react',
		'why-i-love-testing',
		'remix-thoughts',
		'typescript-tips',
	]
	const postReadRows = []
	for (let index = 0; index < TARGET_POST_READS; index += 1) {
		const useUser = index % 5 !== 0
		postReadRows.push([
			randomUUID(),
			isoNow(-index * 1000),
			useUser ? userIds[index % userIds.length] : null,
			useUser ? null : `client-${index % 200}`,
			slugs[index % slugs.length],
		])
	}
	insertMany(
		db,
		`INSERT INTO "PostRead" (id, createdAt, userId, clientId, postSlug) VALUES (?, ?, ?, ?, ?)`,
		postReadRows,
	)

	const favoriteRows = []
	for (let index = 0; index < TARGET_FAVORITES; index += 1) {
		const now = isoNow(-index * 2000)
		favoriteRows.push([
			randomUUID(),
			now,
			now,
			userIds[index % userIds.length],
			index % 2 === 0 ? 'blog' : 'course',
			`content-${index}`,
		])
	}
	insertMany(
		db,
		`INSERT INTO "Favorite" (id, createdAt, updatedAt, userId, contentType, contentId) VALUES (?, ?, ?, ?, ?, ?)`,
		favoriteRows,
	)

	const homeworkRows = []
	for (let index = 0; index < TARGET_HOMEWORK; index += 1) {
		const now = isoNow(-index * 1500)
		const useUser = index % 4 !== 0
		homeworkRows.push([
			randomUUID(),
			now,
			now,
			useUser ? userIds[index % userIds.length] : null,
			useUser ? null : `hw-client-${index}`,
			1 + Math.floor(index / 100),
			1 + (index % 10),
			index % 5,
		])
	}
	insertMany(
		db,
		`INSERT INTO "HomeworkCompletion" (id, createdAt, updatedAt, userId, clientId, seasonNumber, episodeNumber, itemIndex)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		homeworkRows,
	)

	const counts = {
		User: db.prepare('SELECT COUNT(*) AS c FROM "User"').get().c,
		Password: db.prepare('SELECT COUNT(*) AS c FROM "Password"').get().c,
		Passkey: db.prepare('SELECT COUNT(*) AS c FROM "Passkey"').get().c,
		Session: db.prepare('SELECT COUNT(*) AS c FROM "Session"').get().c,
		Verification: db.prepare('SELECT COUNT(*) AS c FROM "Verification"').get().c,
		Call: db.prepare('SELECT COUNT(*) AS c FROM "Call"').get().c,
		CallKentEpisodeDraft: db
			.prepare('SELECT COUNT(*) AS c FROM "CallKentEpisodeDraft"')
			.get().c,
		CallKentCallerEpisode: db
			.prepare('SELECT COUNT(*) AS c FROM "CallKentCallerEpisode"')
			.get().c,
		PostRead: db.prepare('SELECT COUNT(*) AS c FROM "PostRead"').get().c,
		Favorite: db.prepare('SELECT COUNT(*) AS c FROM "Favorite"').get().c,
		HomeworkCompletion: db
			.prepare('SELECT COUNT(*) AS c FROM "HomeworkCompletion"')
			.get().c,
	}

	console.log('Fixture counts:', counts)
	db.close()
}

main()
