import {matchSorter, rankings, MatchSorterOptions} from 'match-sorter'

export function multiWordMatchSorter<ItemType>(
  items: Array<ItemType>,
  searchString: string,
  options: MatchSorterOptions<ItemType>,
) {
  if (!searchString) return items

  const allResults = matchSorter<ItemType>(items, searchString, options)
  const searches = new Set(searchString.split(' '))
  if (searches.size < 2) {
    // if there's only one word then we're done
    return allResults
  }

  // if there are multiple words, we'll conduct an individual search for each word
  const [firstWord, ...restWords] = searches.values()
  if (!firstWord) {
    // this should be impossible, but if it does happen, we'll just return an empty array
    return []
  }
  const individualWordOptions: typeof options = {
    ...options,
    keys: options.keys?.map(key => {
      if (typeof key === 'string') key = {key}
      return {
        ...key,
        maxRanking: rankings.CASE_SENSITIVE_EQUAL,
        threshold: rankings.WORD_STARTS_WITH,
      }
    }),
  }

  // go through each word and further filter the results
  let individualWordResults = matchSorter(
    items,
    firstWord,
    individualWordOptions,
  )
  for (const word of restWords) {
    const searchResult = matchSorter(
      individualWordResults,
      word,
      individualWordOptions,
    )
    individualWordResults = individualWordResults.filter(r =>
      searchResult.includes(r),
    )
  }
  return Array.from(new Set([...allResults, ...individualWordResults]))
}
