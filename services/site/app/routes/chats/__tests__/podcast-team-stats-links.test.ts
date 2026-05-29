import { expect, test } from 'vitest'

import chatsLayoutSource from '#app/routes/chats/_layout.tsx?raw'
import podcastEpisodeSource from '#app/routes/chats_/$season.$episode_.$slug.tsx?raw'
import teamsPageSource from '#app/../content/pages/teams.mdx?raw'

test('podcast overview TeamStats links to listen rankings', () => {
	expect(chatsLayoutSource).toContain('whatsThisHref="/teams#listen-rankings"')
})

test('podcast episode TeamStats links to listen rankings', () => {
	expect(podcastEpisodeSource).toContain(
		'whatsThisHref="/teams#listen-rankings"',
	)
})

test('teams page includes a listen rankings section', () => {
	expect(teamsPageSource).toContain('## Listen Rankings')
})
