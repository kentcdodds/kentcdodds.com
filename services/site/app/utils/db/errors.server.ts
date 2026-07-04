import { DataTableConstraintError } from '@remix-run/data-table'

const UNIQUE_SQLITE_CODES = new Set([
	'SQLITE_CONSTRAINT_UNIQUE',
	'SQLITE_CONSTRAINT',
])

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

function getErrorCode(error: unknown) {
	if (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as { code: unknown }).code === 'string'
	) {
		return (error as { code: string }).code
	}
	return undefined
}

export function isUniqueConstraintError(error: unknown) {
	if (error instanceof DataTableConstraintError) {
		return true
	}

	const code = getErrorCode(error)
	if (code === 'P2002') {
		return true
	}
	if (code && UNIQUE_SQLITE_CODES.has(code)) {
		return true
	}

	const message = getErrorMessage(error).toLowerCase()
	return (
		message.includes('unique constraint failed') ||
		message.includes('unique constraint') ||
		message.includes('constraint failed')
	)
}

export function isNotFoundError(error: unknown) {
	const code = getErrorCode(error)
	if (code === 'P2025') {
		return true
	}

	const message = getErrorMessage(error).toLowerCase()
	return (
		message.includes('not found') ||
		message.includes('no rows') ||
		message.includes('expected a record')
	)
}
