import * as React from 'react'
import { EpisodeArtworkPreview } from '#app/components/calls/episode-artwork-preview.tsx'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'

test('publish anonymously tooltip opens on hover', async () => {
	const screen = await render(
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
	const tooltip = screen.getByRole('tooltip')
	const checkbox = screen.getByRole('checkbox', { name: /publish anonymously/i })

	await expect.poll(() => tooltip.query()).toBeNull()
	await tooltipButton.hover()
	await expect.element(tooltip).toHaveTextContent('If you check this')
	await checkbox.hover()
	await expect.poll(() => tooltip.query()).toBeNull()
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
		const screen = await render(<Example />)

		const checkbox = screen.getByRole('checkbox', {
			name: /publish anonymously/i,
		})
		const img = screen.getByAltText('Episode artwork preview')
		const initialSrc = img.element().getAttribute('src')
		expect(initialSrc).toBeTruthy()

		await checkbox.click()
		await expect.element(checkbox).toBeChecked()

		await expect.element(img).toHaveClass('opacity-60')
		await expect.element(img).toHaveAttribute('src', initialSrc)

		await vi.advanceTimersByTimeAsync(1500)

		await expect.element(img).toHaveClass('opacity-100')
		expect(img.element().getAttribute('src')).not.toBe(initialSrc)
	} finally {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	}
})

