import type { TableAfterRead, TableBeforeWrite } from '@remix-run/data-table'

export const timestampColumns = {
	createdAt: 'createdAt',
	updatedAt: 'updatedAt',
} as const

export function defaultBeforeWrite<
	row extends Record<string, unknown> = Record<string, unknown>,
>({
	uuid = false,
	createdAt = false,
}: {
	uuid?: boolean
	createdAt?: boolean
} = {}): TableBeforeWrite<row> {
	return ((context) => {
		let { value } = context
		if (uuid && context.operation === 'create' && !value.id) {
			value = { ...value, id: crypto.randomUUID() }
		}
		if (createdAt && context.operation === 'create' && !value.createdAt) {
			value = { ...value, createdAt: new Date() }
		}
		return { value }
	}) as TableBeforeWrite<row>
}

export function reviveDateColumns<row extends Record<string, unknown>>(
	columns: readonly (keyof row & string)[],
): TableAfterRead<row> {
	return (context) => {
		const row = { ...context.value }
		for (const column of columns) {
			const field = row[column]
			if (typeof field === 'string' && isIsoDateString(field)) {
				row[column] = new Date(field) as row[typeof column]
			}
		}
		return { value: row }
	}
}

function isIsoDateString(value: string) {
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
}
