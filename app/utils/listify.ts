type ToStringable = {
	toString(): string
}

type ListifyOptions<ItemType extends ToStringable> = {
	type?: Intl.ListFormatOptions['type']
	style?: Intl.ListFormatOptions['style']
	stringify?: (item: ItemType) => string
}

function listify<ItemType extends ToStringable>(
	array: Array<ItemType>,
	{
		type = 'conjunction',
		style = 'long',
		stringify = (thing) => thing.toString(),
	}: ListifyOptions<ItemType> = {},
) {
	const stringified = array.map((item) => stringify(item))
	const formatter = new Intl.ListFormat('en', { style, type })
	return formatter.format(stringified)
}

export { listify }
