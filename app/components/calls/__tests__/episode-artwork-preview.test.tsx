import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { expect, test, vi } from 'vitest'
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

test('episode artwork preview dims while the next image suspends', async () => {
	vi.useFakeTimers()
	const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

	function Example() {
		const [isAnonymous, setIsAnonymous] = React.useState(false)
		return (
			<EpisodeArtworkPreview
				title="My episode title"
				email="person@example.com"
				firstName="Jane"
				team="BLUE"
				origin="https://kentcdodds.com"
				hasGravatar={false}
				isAnonymous={isAnonymous}
				onAnonymousChange={setIsAnonymous}
			/>
		)
	}

	try {
		render(<Example />)

		const checkbox = screen.getByRole('checkbox', { name: /publish anonymously/i })
		const previewImg = screen.getByAltText('Episode artwork preview')
		const previewWrapper = previewImg.parentElement
		expect(previewWrapper).not.toBeNull()

		await user.click(checkbox)
		await vi.advanceTimersByTimeAsync(200)

		expect(previewWrapper).toHaveClass('opacity-60')
	} finally {
		vi.useRealTimers()
	}
})

