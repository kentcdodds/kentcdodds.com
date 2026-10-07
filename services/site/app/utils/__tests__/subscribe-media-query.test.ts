import { expect, test, vi } from 'vitest'
import { subscribeMediaQuery } from '#app/utils/subscribe-media-query.ts'

function createLegacyMediaQueryList() {
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	return {
		matches: false,
		media: '(prefers-reduced-motion: reduce)',
		onchange: null,
		addListener(listener: (event: MediaQueryListEvent) => void) {
			listeners.add(listener)
		},
		removeListener(listener: (event: MediaQueryListEvent) => void) {
			listeners.delete(listener)
		},
		dispatch(event: MediaQueryListEvent) {
			for (const listener of listeners) listener(event)
		},
		listenerCount() {
			return listeners.size
		},
	}
}

test('subscribeMediaQuery uses addEventListener when available', () => {
	const listener = vi.fn()
	const mediaQuery = {
		matches: true,
		media: '(prefers-reduced-motion: reduce)',
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	} satisfies MediaQueryList

	const unsubscribe = subscribeMediaQuery(mediaQuery, listener)

	expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', listener)
	expect(mediaQuery.addListener).not.toHaveBeenCalled()

	unsubscribe()
	expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
		'change',
		listener,
	)
	expect(mediaQuery.removeListener).not.toHaveBeenCalled()
})

test('subscribeMediaQuery falls back to addListener when addEventListener is missing (KCD-10J)', () => {
	const listener = vi.fn()
	const mediaQuery = createLegacyMediaQueryList()

	const unsubscribe = subscribeMediaQuery(
		mediaQuery as unknown as MediaQueryList,
		listener,
	)

	expect(mediaQuery.listenerCount()).toBe(1)

	const event = { matches: true } as MediaQueryListEvent
	mediaQuery.dispatch(event)
	expect(listener).toHaveBeenCalledWith(event)

	unsubscribe()
	expect(mediaQuery.listenerCount()).toBe(0)

	mediaQuery.dispatch(event)
	expect(listener).toHaveBeenCalledTimes(1)
})
