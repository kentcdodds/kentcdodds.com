import { expect, test } from 'vitest'
import { filterIndexItems } from '../not-found-suggestions.server.ts'

test('includes multi-word matches from URL and slug keys', () => {
	const urlOnlyMatch = {
		url: '/react-hooks',
		type: 'blog',
		title: 'Completely unrelated title',
		slug: 'react-hooks',
	}

	expect(filterIndexItems([urlOnlyMatch], 'hooks react')).toEqual([urlOnlyMatch])
})
