import { afterEach, expect, test, vi } from 'vitest'
import { markAsRead } from '../mark-as-read.tsx'

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

test('markAsRead posts the slug to the mark-as-read action', async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(new Response(null, { status: 200 }))
	vi.stubGlobal('fetch', fetchMock)

	const response = await markAsRead({ slug: 'some-post' })

	expect(response?.status).toBe(200)
	expect(fetchMock).toHaveBeenCalledOnce()
	expect(fetchMock.mock.calls[0]?.[0]).toBe('/action/mark-as-read')
	expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
	const body = fetchMock.mock.calls[0]?.[1]?.body
	expect(body).toBeInstanceOf(URLSearchParams)
	expect(String(body)).toBe('slug=some-post')
})

test('markAsRead swallows network TypeErrors so void callers stay quiet', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
	)

	await expect(markAsRead({ slug: 'offline-post' })).resolves.toBeUndefined()
})
