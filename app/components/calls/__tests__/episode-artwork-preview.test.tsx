import { act, fireEvent, render, screen } from '@testing-library/react'
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
	class TestImage {
		onload: null | (() => void) = null
		onerror: null | ((error: unknown) => void) = null

		set src(_value: string) {
			// Resolve predictably so `act()` scopes can complete.
			setTimeout(() => this.onload?.(), 1000)
		}
	}
	vi.stubGlobal('Image', TestImage as unknown as typeof Image)

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
		const initialImg = screen.getByAltText('Episode artwork preview')
		const initialSrc = initialImg.getAttribute('src')
		expect(initialSrc).toBeTruthy()

		await act(async () => {
			fireEvent.click(checkbox)
			expect(checkbox).toBeChecked()

			const pendingImg = screen.getByAltText('Episode artwork preview')
			expect(pendingImg).toHaveClass('opacity-60')
			expect(pendingImg).toHaveAttribute('src', initialSrc)

			await vi.advanceTimersByTimeAsync(1500)
		})
		const loadedImg = screen.getByAltText('Episode artwork preview')
		expect(loadedImg).toHaveClass('opacity-100')
		expect(loadedImg.getAttribute('src')).not.toBe(initialSrc)
	} finally {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	}
})

