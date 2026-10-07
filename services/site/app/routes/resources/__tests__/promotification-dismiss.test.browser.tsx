import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { MemoryRouter } from 'react-router'

import { Promotification } from '../promotification.tsx'

const mockRevalidate = vi.fn()

vi.mock('react-router', async () => {
	const actual =
		await vi.importActual<typeof import('react-router')>('react-router')
	return {
		...actual,
		useRevalidator: () => ({
			state: 'idle' as const,
			revalidate: mockRevalidate,
		}),
	}
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

test('network failure on dismiss keeps the page (banner stays hidden) — KCD-10H', async () => {
	const fetchMock = vi
		.fn()
		.mockRejectedValue(new TypeError('Failed to fetch (kentcdodds.com)'))
	vi.stubGlobal('fetch', fetchMock)

	const screen = await render(
		<MemoryRouter>
			<div data-testid="page-shell">
				<p>Homepage content</p>
				<Promotification
					promoName="kody-launch-2026-09"
					cookieValue={undefined}
					hidePermanentlyOnInteraction
					position="top-center"
				>
					<p>Try Kody</p>
				</Promotification>
			</div>
		</MemoryRouter>,
	)

	await expect
		.element(screen.getByRole('button', { name: 'dismiss message' }))
		.toBeInTheDocument()

	await screen.getByRole('button', { name: 'dismiss message' }).click()

	await expect.poll(() => fetchMock.mock.calls.length).toBe(1)
	expect(fetchMock.mock.calls[0]?.[0]).toBe('/resources/promotification')

	// Page shell must remain — a fetcher-action network failure used to replace
	// the route with the ErrorBoundary (setFetcherError).
	await expect.element(screen.getByTestId('page-shell')).toBeInTheDocument()
	await expect.element(screen.getByText('Homepage content')).toBeInTheDocument()
	await expect
		.element(screen.getByRole('button', { name: 'dismiss message' }))
		.not.toBeInTheDocument()
})

test('Remind me later shows inline error when dismiss fetch fails', async () => {
	const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
	vi.stubGlobal('fetch', fetchMock)

	const promoEndTime = new Date(Date.now() + 60_000)
	const screen = await render(
		<MemoryRouter>
			<Promotification
				promoName="sale-promo"
				cookieValue={undefined}
				promoEndTime={promoEndTime}
				position="top-center"
			>
				<p>Limited sale</p>
			</Promotification>
		</MemoryRouter>,
	)

	await screen.getByRole('button', { name: /Remind me later/i }).click()

	await expect.poll(() => fetchMock.mock.calls.length).toBe(1)
	await expect
		.element(screen.getByRole('alert'))
		.toHaveTextContent('Could not save preference. Please try again.')
	await expect.element(screen.getByText('Limited sale')).toBeInTheDocument()
})
