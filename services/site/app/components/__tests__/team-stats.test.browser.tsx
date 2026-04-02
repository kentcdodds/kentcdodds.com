import * as React from 'react'
import { MemoryRouter } from 'react-router'
import { render } from 'vitest-browser-react'
import { expect, test, vi } from 'vitest'

const { mockUseRootData, mockUseOptionalUser, mockUseTeam } = vi.hoisted(() => ({
	mockUseRootData: vi.fn(),
	mockUseOptionalUser: vi.fn(),
	mockUseTeam: vi.fn(),
}))

vi.mock('#app/utils/use-root-data.ts', () => ({
	useRootData: () => mockUseRootData(),
	useOptionalUser: () => mockUseOptionalUser(),
}))

vi.mock('#app/utils/team-provider.tsx', () => ({
	useTeam: () => mockUseTeam(),
}))

import { TeamStats } from '#app/components/team-stats.tsx'

const rankings = [
	{ team: 'RED', ranking: 1, totalCount: 12, percent: 1 },
	{ team: 'BLUE', ranking: 2, totalCount: 8, percent: 0.67 },
	{ team: 'YELLOW', ranking: 3, totalCount: 4, percent: 0.33 },
]

function renderTeamStats(whatsThisHref?: string) {
	return render(
		<MemoryRouter>
			<TeamStats
				totalCount="24"
				rankings={rankings}
				direction="down"
				pull="left"
				totalLabel="listens"
				whatsThisHref={whatsThisHref}
			/>
		</MemoryRouter>,
	)
}

test('uses the listen rankings help link when provided', async () => {
	mockUseRootData.mockReturnValue({ user: null, userInfo: null })
	mockUseOptionalUser.mockReturnValue(null)
	mockUseTeam.mockReturnValue(['BLUE', vi.fn()])

	const screen = await renderTeamStats('/teams#listen-rankings')

	await expect
		.element(screen.getByRole('link', { name: "what's this?" }))
		.toHaveAttribute('href', '/teams#listen-rankings')
})

test('defaults to the read rankings help link', async () => {
	mockUseRootData.mockReturnValue({ user: null, userInfo: null })
	mockUseOptionalUser.mockReturnValue(null)
	mockUseTeam.mockReturnValue(['BLUE', vi.fn()])

	const screen = await renderTeamStats()

	await expect
		.element(screen.getByRole('link', { name: "what's this?" }))
		.toHaveAttribute('href', '/teams#read-rankings')
})
