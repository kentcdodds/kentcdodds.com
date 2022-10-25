// unfortunately TypeScript doesn't have Intl.ListFormat yet 😢
// so we'll just add it ourselves. Unfortunately, adding it overrides Intl
// in the file we have this code in, so we leave it all by itself...
// Like the outcast it is...
type ListFormatOptions = {
  type?: 'conjunction' | 'disjunction' | 'unit'
  style?: 'long' | 'short' | 'narrow'
  localeMatcher?: 'lookup' | 'best fit'
}
declare namespace Intl {
  class ListFormat {
    constructor(locale: string, options: ListFormatOptions)
    public format: (items: Array<string>) => string
  }
}

type ToStringable = {
  toString(): string
}

type ListifyOptions<ItemType extends ToStringable> = {
  type?: ListFormatOptions['type']
  style?: ListFormatOptions['style']
  stringify?: (item: ItemType) => string
}

function listify<ItemType extends ToStringable>(
  array: Array<ItemType>,
  {
    type = 'conjunction',
    style = 'long',
    stringify = thing => thing.toString(),
  }: ListifyOptions<ItemType> = {},
) {
  const stringified = array.map(item => stringify(item))
  const formatter = new Intl.ListFormat('en', {style, type})
  return formatter.format(stringified)
}

export {listify}
