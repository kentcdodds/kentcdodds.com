import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { EpisodeArtworkPreview } from '#app/components/calls/episode-artwork-preview.tsx'

test('publish anonymously tooltip opens on hover', async () => {
	const user = userEvent.setup()
	render(
		<EpisodeArtworkPreview
			title="My episode title"
			email="person@example.com"
			firstName="Jane"
			team="BLUE"
			origin="https://kentcdodds.com"
			hasGravatar={false}
			isAnonymous={false}
			onAnonymousChange={() => {}}
		/>,
	)

	const tooltipButton = screen.getByRole('button', {
		name: 'What does publish anonymously mean?',
	})

	expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	await user.hover(tooltipButton)
	expect(screen.getByRole('tooltip')).toHaveTextContent('If you check this')
	await user.unhover(tooltipButton)
	expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})

test('episode artwork preview dims while loading and resets when src changes', async () => {
	const props = {
		email: 'person@example.com',
		firstName: 'Jane',
		team: 'BLUE',
		origin: 'https://kentcdodds.com',
		hasGravatar: false,
		onAnonymousChange: () => {},
	} as const

	const { rerender } = render(
		<EpisodeArtworkPreview title="My episode title" isAnonymous={false} {...props} />,
	)

	const img = screen.getByAltText('Episode artwork preview')
	expect(img).toHaveClass('opacity-60')
	fireEvent.load(img)
	await waitFor(() => expect(img).toHaveClass('opacity-100'))

	rerender(
		<EpisodeArtworkPreview title="My episode title" isAnonymous={true} {...props} />,
	)
	await waitFor(() =>
		expect(screen.getByAltText('Episode artwork preview')).toHaveClass('opacity-60'),
	)
})

