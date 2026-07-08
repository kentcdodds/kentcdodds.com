import {
	belongsTo,
	column as c,
	hasMany,
	hasOne,
	type TableRow,
	table,
} from '@remix-run/data-table'
import {
	defaultBeforeWrite,
	timestampColumns,
	reviveDateColumns,
} from './schema-helpers.server.ts'
import {
	normalizePasskeyCounter,
	normalizePublicKey,
} from './row-serialization.server.ts'

const dateColumns = {
	user: ['createdAt', 'updatedAt'] as const,
	password: ['createdAt', 'updatedAt'] as const,
	verification: ['createdAt', 'expiresAt'] as const,
	session: ['createdAt', 'expirationDate'] as const,
	call: ['createdAt', 'updatedAt'] as const,
	callKentEpisodeDraft: ['createdAt', 'updatedAt'] as const,
	callKentCallerEpisode: ['createdAt', 'updatedAt'] as const,
	postRead: ['createdAt'] as const,
	passkey: ['createdAt', 'updatedAt'] as const,
	favorite: ['createdAt', 'updatedAt'] as const,
	homeworkCompletion: ['createdAt', 'updatedAt'] as const,
}

export const userTable = table({
	name: 'User',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		email: c.text(),
		firstName: c.text(),
		discordId: c.text().nullable(),
		kitId: c.text().nullable(),
		role: c.text(),
		team: c.text(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.user),
})

export const passwordTable = table({
	name: 'Password',
	columns: {
		hash: c.text(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		userId: c.uuid(),
	},
	primaryKey: 'userId',
	timestamps: timestampColumns,
	afterRead: reviveDateColumns(dateColumns.password),
})

export const verificationTable = table({
	name: 'Verification',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		type: c.text(),
		target: c.text(),
		codeHash: c.text(),
		expiresAt: c.timestamp(),
	},
	primaryKey: 'id',
	beforeWrite: defaultBeforeWrite({ uuid: true, createdAt: true }),
	afterRead: reviveDateColumns(dateColumns.verification),
})

export const sessionTable = table({
	name: 'Session',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		userId: c.uuid(),
		expirationDate: c.timestamp(),
	},
	primaryKey: 'id',
	beforeWrite: defaultBeforeWrite({ uuid: true, createdAt: true }),
	afterRead: reviveDateColumns(dateColumns.session),
})

export const callTable = table({
	name: 'Call',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		title: c.text(),
		notes: c.text().nullable(),
		isAnonymous: c.boolean(),
		callerTranscript: c.text().nullable(),
		callerTranscriptStatus: c.text(),
		callerTranscriptErrorMessage: c.text().nullable(),
		userId: c.uuid(),
		audioKey: c.text().nullable(),
		audioContentType: c.text().nullable(),
		audioSize: c.integer().nullable(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.call),
})

export const callKentEpisodeDraftTable = table({
	name: 'CallKentEpisodeDraft',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		status: c.text(),
		step: c.text(),
		errorMessage: c.text().nullable(),
		episodeAudioKey: c.text().nullable(),
		episodeAudioContentType: c.text().nullable(),
		episodeAudioSize: c.integer().nullable(),
		responseAudioKey: c.text().nullable(),
		responseAudioContentType: c.text().nullable(),
		responseAudioSize: c.integer().nullable(),
		callerSegmentAudioKey: c.text().nullable(),
		responseSegmentAudioKey: c.text().nullable(),
		transcript: c.text().nullable(),
		title: c.text().nullable(),
		description: c.text().nullable(),
		keywords: c.text().nullable(),
		callId: c.uuid(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.callKentEpisodeDraft),
})

export const callKentCallerEpisodeTable = table({
	name: 'CallKentCallerEpisode',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		userId: c.uuid(),
		callTitle: c.text(),
		callNotes: c.text().nullable(),
		isAnonymous: c.boolean(),
		transistorEpisodeId: c.text(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.callKentCallerEpisode),
})

export const postReadTable = table({
	name: 'PostRead',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		userId: c.uuid().nullable(),
		clientId: c.text().nullable(),
		postSlug: c.text(),
	},
	primaryKey: 'id',
	beforeWrite: defaultBeforeWrite({ uuid: true, createdAt: true }),
	afterRead: reviveDateColumns(dateColumns.postRead),
})

export const passkeyTable = table({
	name: 'Passkey',
	columns: {
		id: c.text(),
		aaguid: c.text(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		publicKey: c.binary(),
		userId: c.uuid(),
		webauthnUserId: c.text(),
		counter: c.bigint(),
		deviceType: c.text(),
		backedUp: c.boolean(),
		transports: c.text().nullable(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	afterRead: (context) => {
		const revived = reviveDateColumns(dateColumns.passkey)(context)
		if (!('value' in revived)) return revived
		return {
			value: {
				...revived.value,
				counter: normalizePasskeyCounter(revived.value.counter),
				publicKey: normalizePublicKey(revived.value.publicKey),
			},
		}
	},
})

export const favoriteTable = table({
	name: 'Favorite',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		userId: c.uuid(),
		contentType: c.text(),
		contentId: c.text(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.favorite),
})

export const homeworkCompletionTable = table({
	name: 'HomeworkCompletion',
	columns: {
		id: c.uuid(),
		createdAt: c.timestamp(),
		updatedAt: c.timestamp(),
		userId: c.uuid().nullable(),
		clientId: c.text().nullable(),
		seasonNumber: c.integer(),
		episodeNumber: c.integer(),
		itemIndex: c.integer(),
	},
	primaryKey: 'id',
	timestamps: timestampColumns,
	beforeWrite: defaultBeforeWrite({ uuid: true }),
	afterRead: reviveDateColumns(dateColumns.homeworkCompletion),
})

export const userPassword = hasOne(userTable, passwordTable, {
	foreignKey: 'userId',
})
export const userPasskeys = hasMany(userTable, passkeyTable, {
	foreignKey: 'userId',
})
export const userCalls = hasMany(userTable, callTable, { foreignKey: 'userId' })
export const userCallKentCallerEpisodes = hasMany(
	userTable,
	callKentCallerEpisodeTable,
	{ foreignKey: 'userId' },
)
export const userSessions = hasMany(userTable, sessionTable, {
	foreignKey: 'userId',
})
export const userPostReads = hasMany(userTable, postReadTable, {
	foreignKey: 'userId',
})
export const userFavorites = hasMany(userTable, favoriteTable, {
	foreignKey: 'userId',
})
export const userHomeworkCompletions = hasMany(
	userTable,
	homeworkCompletionTable,
	{ foreignKey: 'userId' },
)

export const passwordUser = belongsTo(passwordTable, userTable, {
	foreignKey: 'userId',
})
export const sessionUser = belongsTo(sessionTable, userTable, {
	foreignKey: 'userId',
})
export const callUser = belongsTo(callTable, userTable, { foreignKey: 'userId' })
export const callEpisodeDraft = hasOne(callTable, callKentEpisodeDraftTable, {
	foreignKey: 'callId',
})
export const callKentEpisodeDraftCall = belongsTo(
	callKentEpisodeDraftTable,
	callTable,
	{ foreignKey: 'callId' },
)
export const callKentCallerEpisodeUser = belongsTo(
	callKentCallerEpisodeTable,
	userTable,
	{ foreignKey: 'userId' },
)
export const postReadUser = belongsTo(postReadTable, userTable, {
	foreignKey: 'userId',
})
export const passkeyUser = belongsTo(passkeyTable, userTable, {
	foreignKey: 'userId',
})
export const favoriteUser = belongsTo(favoriteTable, userTable, {
	foreignKey: 'userId',
})
export const homeworkCompletionUser = belongsTo(
	homeworkCompletionTable,
	userTable,
	{ foreignKey: 'userId' },
)

export type User = {
	id: string
	createdAt: Date
	updatedAt: Date
	email: string
	firstName: string
	discordId: string | null
	kitId: string | null
	role: string
	team: string
}
export type Password = {
	hash: string
	createdAt: Date
	updatedAt: Date
	userId: string
}
export type Verification = {
	id: string
	createdAt: Date
	type: string
	target: string
	codeHash: string
	expiresAt: Date
}
export type Session = {
	id: string
	createdAt: Date
	userId: string
	expirationDate: Date
}
export type Call = TableRow<typeof callTable> & {
	createdAt: Date
	updatedAt: Date
}
export type CallKentEpisodeDraft = TableRow<typeof callKentEpisodeDraftTable> & {
	createdAt: Date
	updatedAt: Date
}
export type CallKentCallerEpisode = TableRow<
	typeof callKentCallerEpisodeTable
> & {
	createdAt: Date
	updatedAt: Date
}
export type PostRead = {
	id: string
	createdAt: Date
	userId: string | null
	clientId: string | null
	postSlug: string
}
export type Passkey = {
	id: string
	aaguid: string
	createdAt: Date
	updatedAt: Date
	publicKey: Uint8Array
	userId: string
	webauthnUserId: string
	counter: number
	deviceType: string
	backedUp: boolean
	transports: string | null
}
export type Favorite = TableRow<typeof favoriteTable> & {
	createdAt: Date
	updatedAt: Date
}
export type HomeworkCompletion = TableRow<typeof homeworkCompletionTable> & {
	createdAt: Date
	updatedAt: Date
}

export type CallTranscriptStatus =
	| 'NOT_STARTED'
	| 'PROCESSING'
	| 'READY'
	| 'ERROR'

export type CallKentEpisodeDraftStatus =
	| 'PROCESSING'
	| 'READY'
	| 'ERROR'
	| 'CANCELLED'

export type CallKentEpisodeDraftStep =
	| 'STARTED'
	| 'GENERATING_AUDIO'
	| 'TRANSCRIBING'
	| 'GENERATING_METADATA'
	| 'DONE'
