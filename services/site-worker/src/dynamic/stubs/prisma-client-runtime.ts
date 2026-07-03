export class PrismaClientKnownRequestError extends Error {
	code?: string
	meta?: unknown
	clientVersion?: string

	constructor(
		message: string,
		{
			code,
			clientVersion,
			meta,
		}: {
			code?: string
			clientVersion?: string
			meta?: unknown
		} = {},
	) {
		super(message)
		this.name = 'PrismaClientKnownRequestError'
		this.code = code
		this.meta = meta
		this.clientVersion = clientVersion
	}
}

export class PrismaClientUnknownRequestError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientUnknownRequestError'
	}
}

export class PrismaClientRustPanicError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientRustPanicError'
	}
}

export class PrismaClientInitializationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientInitializationError'
	}
}

export class PrismaClientValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PrismaClientValidationError'
	}
}

export const DMMF = {}

export const Types = {
	Public: {
		PrismaPromise: Promise,
		Args: {} as unknown,
		Payload: {} as unknown,
		Result: {} as unknown,
		Exact: {} as unknown,
	},
	Utils: {
		JsPromise: Promise,
		UnwrapTuple: {} as unknown,
		Call: {} as unknown,
	},
	Extensions: {
		DefaultArgs: {},
		InternalArgs: {},
		ExtendsHook: (() => undefined) as unknown,
		UserArgs: {} as unknown,
	},
}

export const Extensions = {
	getExtensionContext: () => ({}),
	defineExtension: <T>(extension: T) => extension,
}

export function makeStrictEnum<T extends Record<PropertyKey, string | number>>(
	definition: T,
): T {
	return definition
}

export const ITXClientDenyList = [] as const

export type GetPrismaClientConfig = Record<string, unknown>

export function getPrismaClient(_config: GetPrismaClientConfig) {
	return class PrismaClientStub {
		constructor() {
			throw new Error(
				'Prisma engine is unavailable in the worker build; use PRISMA_RPC.',
			)
		}
	}
}

export const prismaVersion = {
	client: 'worker-stub',
	engine: 'worker-stub',
}

export class Decimal {
	constructor(_value: unknown) {}
}

export type DecimalJsLike = { toFixed(): string }

export class Sql {
	constructor(_strings: TemplateStringsArray, ..._values: unknown[]) {}
}

export const sqltag = () => new Sql([] as unknown as TemplateStringsArray)
export const empty = ''
export const join = () => ''
export const raw = () => new Sql([] as unknown as TemplateStringsArray)

export type Bytes = Uint8Array
export type JsonObject = Record<string, unknown>
export type JsonArray = unknown[]
export type JsonValue = unknown
export type InputJsonObject = Record<string, unknown>
export type InputJsonArray = unknown[]
export type InputJsonValue = unknown

export const DbNull = Symbol.for('prisma.dbnull')
export const JsonNull = Symbol.for('prisma.jsonnull')
export const AnyNull = Symbol.for('prisma.anynull')
export const NullTypes = {
	DbNull,
	JsonNull,
	AnyNull,
}

export type Operation = string

export const TransactionIsolationLevel = {
	Serializable: 'Serializable',
} as const
