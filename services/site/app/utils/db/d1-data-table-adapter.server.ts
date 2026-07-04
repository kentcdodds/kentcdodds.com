// Adapted from epicweb-dev/epicflare worker/d1-data-table-adapter.ts (MIT) and
// parameterized over a thin SQL executor so the same adapter works for direct
// D1 (parent worker) and D1_RPC loopback (dynamic app worker).
//
// Transaction invariant: D1 executors set `supportsSqlTransactions: false` so
// beginTransaction/commit/rollback become no-ops (D1 forbids SQL BEGIN/COMMIT).
// Node better-sqlite3 keeps `supportsSqlTransactions: true` for real transactions.
import {
	getTableName,
	getTablePrimaryKey,
	type AdapterCapabilityOverrides,
	type AdapterCapabilities,
	type DataManipulationOperation,
	type DataManipulationRequest,
	type DataManipulationResult,
	type SqlStatement,
	type TableRef,
	type DatabaseAdapter,
	type TransactionOptions,
	type TransactionToken,
} from '@remix-run/data-table'
import {
	type D1Meta,
	type D1SqlExecutor,
	type D1StatementResult,
} from './d1-sql-executor.server.ts'

type SqliteCompileContext = {
	values: Array<unknown>
}

type CompiledSqlStatement = {
	text: string
	values: Array<unknown>
}

/**
 * `DatabaseAdapter` implementation for SQLite semantics over a D1-like executor.
 */
export class SqliteExecutorDataTableAdapter implements DatabaseAdapter {
	dialect = 'sqlite'
	capabilities: AdapterCapabilities

	#executor: D1SqlExecutor
	#transactions = new Set<string>()
	#transactionCounter = 0

	constructor(
		executor: D1SqlExecutor,
		options?: {
			capabilities?: AdapterCapabilityOverrides
		},
	) {
		this.#executor = executor
		this.capabilities = {
			returning: options?.capabilities?.returning ?? true,
			savepoints: options?.capabilities?.savepoints ?? false,
			upsert: options?.capabilities?.upsert ?? true,
			transactionalDdl: options?.capabilities?.transactionalDdl ?? false,
			migrationLock: options?.capabilities?.migrationLock ?? false,
		}
	}

	compileSql(operation: DataManipulationOperation): Array<SqlStatement> {
		const statement = compileSqliteStatement(operation)
		return [{ text: statement.text, values: statement.values }]
	}

	async execute(
		request: DataManipulationRequest,
	): Promise<DataManipulationResult> {
		if (
			request.operation.kind === 'insertMany' &&
			request.operation.values.length === 0
		) {
			return {
				affectedRows: 0,
				insertId: undefined,
				rows: request.operation.returning ? [] : undefined,
			}
		}

		const statement = compileSqliteStatement(request.operation)

		const shouldReadRows =
			request.operation.kind === 'select' ||
			request.operation.kind === 'count' ||
			request.operation.kind === 'exists' ||
			hasReturningClause(request.operation) ||
			(request.operation.kind === 'raw' && isReadSql(statement.text))

		if (shouldReadRows) {
			const result = await this.#executor.query(
				statement.text,
				statement.values,
			)
			let rows = normalizeRows(result.results ?? [])
			if (
				request.operation.kind === 'count' ||
				request.operation.kind === 'exists'
			) {
				rows = normalizeCountRows(rows)
			}
			return {
				rows,
				affectedRows: normalizeAffectedRowsForReader(
					request.operation.kind,
					rows,
					result.meta,
				),
				insertId: normalizeInsertIdForReader(
					request.operation.kind,
					request.operation,
					rows,
					result.meta,
				),
			}
		}

		const result = await this.#executor.run(statement.text, statement.values)
		return {
			affectedRows: normalizeAffectedRowsForRun(request.operation.kind, result),
			insertId: normalizeInsertIdForRun(
				request.operation.kind,
				request.operation,
				result,
			),
		}
	}

	async executeScript(
		sql: string,
		_transaction?: TransactionToken,
	): Promise<void> {
		await this.#executor.exec(sql)
	}

	async hasTable(table: TableRef): Promise<boolean> {
		const result = await this.#executor.query(
			"select 1 from sqlite_master where type = 'table' and name = ? limit 1",
			[table.name],
		)
		return Boolean(result.results?.length)
	}

	async hasColumn(table: TableRef, column: string): Promise<boolean> {
		const result = await this.#executor.query(
			`pragma table_info(${quotePath(table.name)})`,
		)
		return (result.results ?? []).some((field) => field.name === column)
	}

	async beginTransaction(
		options?: TransactionOptions,
	): Promise<TransactionToken> {
		this.#transactionCounter += 1
		const token = { id: 'tx_' + String(this.#transactionCounter) }
		this.#transactions.add(token.id)

		if (this.#executor.supportsSqlTransactions === false) {
			return token
		}

		if (options?.isolationLevel === 'read uncommitted') {
			await this.#executor.exec('PRAGMA read_uncommitted = true')
		}

		await this.#executor.exec('BEGIN')
		return token
	}

	async commitTransaction(token: TransactionToken): Promise<void> {
		this.#assertTransaction(token)
		if (this.#executor.supportsSqlTransactions !== false) {
			await this.#executor.exec('COMMIT')
		}
		this.#transactions.delete(token.id)
	}

	async rollbackTransaction(token: TransactionToken): Promise<void> {
		this.#assertTransaction(token)
		if (this.#executor.supportsSqlTransactions !== false) {
			await this.#executor.exec('ROLLBACK')
		}
		this.#transactions.delete(token.id)
	}

	async createSavepoint(
		_token: TransactionToken,
		_name: string,
	): Promise<void> {
		throw new Error('SqliteExecutorDataTableAdapter savepoints are not supported')
	}

	async rollbackToSavepoint(
		_token: TransactionToken,
		_name: string,
	): Promise<void> {
		throw new Error('SqliteExecutorDataTableAdapter savepoints are not supported')
	}

	async releaseSavepoint(
		_token: TransactionToken,
		_name: string,
	): Promise<void> {
		throw new Error('SqliteExecutorDataTableAdapter savepoints are not supported')
	}

	#assertTransaction(token: TransactionToken) {
		if (!this.#transactions.has(token.id)) {
			throw new Error('Unknown transaction token: ' + token.id)
		}
	}
}

export function createSqliteExecutorDataTableAdapter(
	executor: D1SqlExecutor,
	options?: {
		capabilities?: AdapterCapabilityOverrides
	},
) {
	return new SqliteExecutorDataTableAdapter(executor, options)
}

function isReadSql(text: string) {
	const trimmed = text.trimStart().toLowerCase()
	return trimmed.startsWith('select') || trimmed.startsWith('with')
}

function hasReturningClause(statement: DataManipulationOperation) {
	return (
		(statement.kind === 'insert' ||
			statement.kind === 'insertMany' ||
			statement.kind === 'update' ||
			statement.kind === 'delete' ||
			statement.kind === 'upsert') &&
		Boolean(statement.returning)
	)
}

function normalizeRows(rows: Array<Record<string, unknown>>) {
	return rows.map((row) => {
		if (typeof row !== 'object' || row === null) {
			return {}
		}
		return { ...row }
	})
}

function normalizeCountRows(rows: Array<Record<string, unknown>>) {
	return rows.map((row) => {
		const count = row.count
		if (typeof count === 'string') {
			const numeric = Number(count)
			if (!Number.isNaN(numeric)) {
				return {
					...row,
					count: numeric,
				}
			}
		}
		if (typeof count === 'bigint') {
			return {
				...row,
				count: Number(count),
			}
		}
		return row
	})
}

function normalizeAffectedRowsForReader(
	kind: DataManipulationOperation['kind'],
	rows: Array<Record<string, unknown>>,
	meta?: D1Meta,
) {
	if (isWriteStatementKind(kind)) {
		if (typeof meta?.changes === 'number') {
			return meta.changes
		}
		return rows.length
	}
	return undefined
}

function normalizeInsertIdForReader(
	kind: DataManipulationOperation['kind'],
	statement: DataManipulationOperation,
	rows: Array<Record<string, unknown>>,
	meta?: D1Meta,
) {
	if (!isInsertStatementKind(kind) || !isInsertStatement(statement)) {
		return undefined
	}
	const primaryKey = getTablePrimaryKey(statement.table)
	if (primaryKey.length !== 1) {
		return undefined
	}
	const key = primaryKey[0]
	if (!key) {
		return meta?.last_row_id
	}
	const row = rows[rows.length - 1]
	return row?.[key] ?? meta?.last_row_id
}

function normalizeAffectedRowsForRun(
	kind: DataManipulationOperation['kind'],
	result: D1StatementResult,
) {
	if (kind === 'select' || kind === 'count' || kind === 'exists') {
		return undefined
	}
	return result.meta?.changes
}

function normalizeInsertIdForRun(
	kind: DataManipulationOperation['kind'],
	statement: DataManipulationOperation,
	result: D1StatementResult,
) {
	if (!isInsertStatementKind(kind) || !isInsertStatement(statement)) {
		return undefined
	}
	if (getTablePrimaryKey(statement.table).length !== 1) {
		return undefined
	}
	return result.meta?.last_row_id
}

function isWriteStatementKind(kind: DataManipulationOperation['kind']) {
	return (
		kind === 'insert' ||
		kind === 'insertMany' ||
		kind === 'update' ||
		kind === 'delete' ||
		kind === 'upsert'
	)
}

function isInsertStatementKind(kind: DataManipulationOperation['kind']) {
	return kind === 'insert' || kind === 'insertMany' || kind === 'upsert'
}

function isInsertStatement(
	statement: DataManipulationOperation,
): statement is Extract<
	DataManipulationOperation,
	{ kind: 'insert' | 'insertMany' | 'upsert' }
> {
	return (
		statement.kind === 'insert' ||
		statement.kind === 'insertMany' ||
		statement.kind === 'upsert'
	)
}

/**
 * Adapted from `@remix-run/data-table-sqlite` SQL compiler to keep this D1
 * adapter self-contained without depending on internal package paths.
 */
function compileSqliteStatement(
	statement: DataManipulationOperation,
): CompiledSqlStatement {
	if (statement.kind === 'raw') {
		return {
			text: statement.sql.text,
			values: [...statement.sql.values],
		}
	}

	const context: SqliteCompileContext = { values: [] }

	if (statement.kind === 'select') {
		let selection = '*'
		if (statement.select !== '*') {
			selection = statement.select
				.map(
					(field) =>
						quotePath(field.column) + ' as ' + quoteIdentifier(field.alias),
				)
				.join(', ')
		}
		return {
			text:
				'select ' +
				(statement.distinct ? 'distinct ' : '') +
				selection +
				compileFromClause(
					statement.table,
					statement.joins as Array<unknown>,
					context,
				) +
				compileWhereClause(statement.where as Array<unknown>, context) +
				compileGroupByClause(statement.groupBy) +
				compileHavingClause(statement.having as Array<unknown>, context) +
				compileOrderByClause(statement.orderBy as Array<unknown>) +
				compileLimitClause(statement.limit) +
				compileOffsetClause(statement.offset),
			values: context.values,
		}
	}

	if (statement.kind === 'count' || statement.kind === 'exists') {
		const inner =
			'select 1' +
			compileFromClause(
				statement.table,
				statement.joins as Array<unknown>,
				context,
			) +
			compileWhereClause(statement.where as Array<unknown>, context) +
			compileGroupByClause(statement.groupBy) +
			compileHavingClause(statement.having as Array<unknown>, context)
		return {
			text:
				'select count(*) as ' +
				quoteIdentifier('count') +
				' from (' +
				inner +
				') as ' +
				quoteIdentifier('__dt_count'),
			values: context.values,
		}
	}

	if (statement.kind === 'insert') {
		return compileInsertStatement(
			statement.table,
			statement.values as Record<string, unknown>,
			statement.returning,
			context,
		)
	}

	if (statement.kind === 'insertMany') {
		return compileInsertManyStatement(
			statement.table,
			statement.values as Array<Record<string, unknown>>,
			statement.returning,
			context,
		)
	}

	if (statement.kind === 'update') {
		const columns = Object.keys(statement.changes)
		return {
			text:
				'update ' +
				quotePath(getTableName(statement.table)) +
				' set ' +
				columns
					.map(
						(column) =>
							quotePath(column) +
							' = ' +
							pushValue(
								context,
								(statement.changes as Record<string, unknown>)[column],
							),
					)
					.join(', ') +
				compileWhereClause(statement.where as Array<unknown>, context) +
				compileReturningClause(statement.returning),
			values: context.values,
		}
	}

	if (statement.kind === 'delete') {
		return {
			text:
				'delete from ' +
				quotePath(getTableName(statement.table)) +
				compileWhereClause(statement.where as Array<unknown>, context) +
				compileReturningClause(statement.returning),
			values: context.values,
		}
	}

	if (statement.kind === 'upsert') {
		return compileUpsertStatement(statement, context)
	}

	throw new Error('Unsupported statement kind')
}

function compileInsertStatement(
	table: Extract<DataManipulationOperation, { kind: 'insert' }>['table'],
	values: Record<string, unknown>,
	returning: Extract<
		DataManipulationOperation,
		{ kind: 'insert' }
	>['returning'],
	context: SqliteCompileContext,
): CompiledSqlStatement {
	const columns = Object.keys(values)
	if (columns.length === 0) {
		return {
			text:
				'insert into ' +
				quotePath(getTableName(table)) +
				' default values' +
				compileReturningClause(returning),
			values: context.values,
		}
	}

	return {
		text:
			'insert into ' +
			quotePath(getTableName(table)) +
			' (' +
			columns.map((column) => quotePath(column)).join(', ') +
			') values (' +
			columns.map((column) => pushValue(context, values[column])).join(', ') +
			')' +
			compileReturningClause(returning),
		values: context.values,
	}
}

function compileInsertManyStatement(
	table: Extract<DataManipulationOperation, { kind: 'insertMany' }>['table'],
	rows: Array<Record<string, unknown>>,
	returning: Extract<
		DataManipulationOperation,
		{ kind: 'insertMany' }
	>['returning'],
	context: SqliteCompileContext,
): CompiledSqlStatement {
	if (rows.length === 0) {
		return {
			text: 'select 0 where 1 = 0',
			values: context.values,
		}
	}

	const columns = collectColumns(rows)
	if (columns.length === 0) {
		return {
			text:
				'insert into ' +
				quotePath(getTableName(table)) +
				' default values' +
				compileReturningClause(returning),
			values: context.values,
		}
	}

	return {
		text:
			'insert into ' +
			quotePath(getTableName(table)) +
			' (' +
			columns.map((column) => quotePath(column)).join(', ') +
			') values ' +
			rows
				.map(
					(row) =>
						'(' +
						columns
							.map((column) => {
								const value = Object.prototype.hasOwnProperty.call(row, column)
									? row[column]
									: null
								return pushValue(context, value)
							})
							.join(', ') +
						')',
				)
				.join(', ') +
			compileReturningClause(returning),
		values: context.values,
	}
}

function compileUpsertStatement(
	statement: Extract<DataManipulationOperation, { kind: 'upsert' }>,
	context: SqliteCompileContext,
): CompiledSqlStatement {
	const insertColumns = Object.keys(statement.values)
	const conflictTarget = statement.conflictTarget ?? [
		...getTablePrimaryKey(statement.table),
	]
	if (insertColumns.length === 0) {
		throw new Error('upsert requires at least one value')
	}

	const updateValues = statement.update ?? statement.values
	const updateColumns = Object.keys(updateValues)
	let conflictClause = ''

	if (updateColumns.length === 0) {
		conflictClause =
			' on conflict (' +
			conflictTarget.map((column) => quotePath(column)).join(', ') +
			') do nothing'
	} else {
		conflictClause =
			' on conflict (' +
			conflictTarget.map((column) => quotePath(column)).join(', ') +
			') do update set ' +
			updateColumns
				.map(
					(column) =>
						quotePath(column) +
						' = ' +
						pushValue(
							context,
							(updateValues as Record<string, unknown>)[column],
						),
				)
				.join(', ')
	}

	return {
		text:
			'insert into ' +
			quotePath(getTableName(statement.table)) +
			' (' +
			insertColumns.map((column) => quotePath(column)).join(', ') +
			') values (' +
			insertColumns
				.map((column) =>
					pushValue(
						context,
						(statement.values as Record<string, unknown>)[column],
					),
				)
				.join(', ') +
			')' +
			conflictClause +
			compileReturningClause(statement.returning),
		values: context.values,
	}
}

function compileFromClause(
	table: DataManipulationOperation extends infer T
		? T extends { table: infer tableType }
			? tableType
			: never
		: never,
	joins: Array<unknown>,
	context: SqliteCompileContext,
) {
	let output = ' from ' + quotePath(getTableName(table))
	for (const join of joins) {
		const typedJoin = join as {
			type: 'inner' | 'left' | 'right'
			table: Parameters<typeof getTableName>[0]
			on: unknown
		}
		output +=
			' ' +
			normalizeJoinType(typedJoin.type) +
			' join ' +
			quotePath(getTableName(typedJoin.table)) +
			' on ' +
			compilePredicate(typedJoin.on, context)
	}
	return output
}

function compileWhereClause(
	predicates: Array<unknown>,
	context: SqliteCompileContext,
) {
	if (predicates.length === 0) {
		return ''
	}
	return (
		' where ' +
		predicates
			.map((predicate) => '(' + compilePredicate(predicate, context) + ')')
			.join(' and ')
	)
}

function compileGroupByClause(columns: Array<string>) {
	if (columns.length === 0) {
		return ''
	}
	return ' group by ' + columns.map((column) => quotePath(column)).join(', ')
}

function compileHavingClause(
	predicates: Array<unknown>,
	context: SqliteCompileContext,
) {
	if (predicates.length === 0) {
		return ''
	}
	return (
		' having ' +
		predicates
			.map((predicate) => '(' + compilePredicate(predicate, context) + ')')
			.join(' and ')
	)
}

function compileOrderByClause(orderBy: Array<unknown>) {
	if (orderBy.length === 0) {
		return ''
	}
	return (
		' order by ' +
		orderBy
			.map((clause) => {
				const typedClause = clause as {
					column: string
					direction: 'asc' | 'desc'
				}
				return (
					quotePath(typedClause.column) +
					' ' +
					typedClause.direction.toUpperCase()
				)
			})
			.join(', ')
	)
}

function compileLimitClause(limit?: number) {
	if (limit === undefined) {
		return ''
	}
	return ' limit ' + String(limit)
}

function compileOffsetClause(offset?: number) {
	if (offset === undefined) {
		return ''
	}
	return ' offset ' + String(offset)
}

function compileReturningClause(returning?: '*' | Array<string>) {
	if (!returning) {
		return ''
	}
	if (returning === '*') {
		return ' returning *'
	}
	return ' returning ' + returning.map((column) => quotePath(column)).join(', ')
}

function compilePredicate(
	predicate: unknown,
	context: SqliteCompileContext,
): string {
	const typedPredicate = predicate as {
		type: string
		[column: string]: unknown
	}

	if (typedPredicate.type === 'comparison') {
		const column = quotePath(String(typedPredicate.column))

		if (typedPredicate.operator === 'eq') {
			if (
				typedPredicate.valueType === 'value' &&
				(typedPredicate.value === null || typedPredicate.value === undefined)
			) {
				return column + ' is null'
			}
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' = ' + comparisonValue
		}

		if (typedPredicate.operator === 'ne') {
			if (
				typedPredicate.valueType === 'value' &&
				(typedPredicate.value === null || typedPredicate.value === undefined)
			) {
				return column + ' is not null'
			}
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' <> ' + comparisonValue
		}

		if (typedPredicate.operator === 'gt') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' > ' + comparisonValue
		}

		if (typedPredicate.operator === 'gte') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' >= ' + comparisonValue
		}

		if (typedPredicate.operator === 'lt') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' < ' + comparisonValue
		}

		if (typedPredicate.operator === 'lte') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' <= ' + comparisonValue
		}

		if (
			typedPredicate.operator === 'in' ||
			typedPredicate.operator === 'notIn'
		) {
			const values = Array.isArray(typedPredicate.value)
				? typedPredicate.value
				: []
			if (values.length === 0) {
				return typedPredicate.operator === 'in' ? '1 = 0' : '1 = 1'
			}

			const keyword = typedPredicate.operator === 'in' ? 'in' : 'not in'
			return (
				column +
				' ' +
				keyword +
				' (' +
				values.map((value) => pushValue(context, value)).join(', ') +
				')'
			)
		}

		if (typedPredicate.operator === 'like') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return column + ' like ' + comparisonValue
		}

		if (typedPredicate.operator === 'ilike') {
			const comparisonValue = compileComparisonValue(typedPredicate, context)
			return 'lower(' + column + ') like lower(' + comparisonValue + ')'
		}
	}

	if (typedPredicate.type === 'between') {
		return (
			quotePath(String(typedPredicate.column)) +
			' between ' +
			pushValue(context, typedPredicate.lower) +
			' and ' +
			pushValue(context, typedPredicate.upper)
		)
	}

	if (typedPredicate.type === 'null') {
		return (
			quotePath(String(typedPredicate.column)) +
			(typedPredicate.operator === 'isNull' ? ' is null' : ' is not null')
		)
	}

	if (typedPredicate.type === 'logical') {
		const predicates = Array.isArray(typedPredicate.predicates)
			? typedPredicate.predicates
			: []
		if (predicates.length === 0) {
			return typedPredicate.operator === 'and' ? '1 = 1' : '1 = 0'
		}
		const joiner = typedPredicate.operator === 'and' ? ' and ' : ' or '
		return predicates
			.map((child) => '(' + compilePredicate(child, context) + ')')
			.join(joiner)
	}

	throw new Error('Unsupported predicate')
}

function compileComparisonValue(predicate: any, context: SqliteCompileContext) {
	if (predicate.valueType === 'column') {
		return quotePath(String(predicate.value))
	}
	return pushValue(context, predicate.value)
}

function normalizeJoinType(type: 'inner' | 'left' | 'right') {
	if (type === 'left') {
		return 'left'
	}
	if (type === 'right') {
		return 'right'
	}
	return 'inner'
}

function quoteIdentifier(value: string) {
	return '"' + value.replace(/"/g, '""') + '"'
}

function quotePath(path: string) {
	if (path === '*') {
		return '*'
	}
	return path
		.split('.')
		.map((segment) => {
			if (segment === '*') {
				return '*'
			}
			return quoteIdentifier(segment)
		})
		.join('.')
}

function pushValue(context: SqliteCompileContext, value: unknown) {
	context.values.push(normalizeBoundValue(value))
	return '?'
}

function normalizeBoundValue(value: unknown) {
	if (typeof value === 'boolean') {
		return value ? 1 : 0
	}
	return value
}

function collectColumns(rows: Array<Record<string, unknown>>) {
	const columns: Array<string> = []
	const seen = new Set<string>()
	for (const row of rows) {
		for (const key in row) {
			if (!Object.prototype.hasOwnProperty.call(row, key)) {
				continue
			}
			if (seen.has(key)) {
				continue
			}
			seen.add(key)
			columns.push(key)
		}
	}
	return columns
}
