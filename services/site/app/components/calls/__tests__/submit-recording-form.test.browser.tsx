import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'

const { mockNavigate, mockRevalidate, mockUseRootData } = vi.hoisted(() => ({
	mockNavigate: vi.fn(),
	mockRevalidate: vi.fn(),
	mockUseRootData: vi.fn(),
}))

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router')
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useRevalidator: () => ({ revalidate: mockRevalidate }),
	}
})

vi.mock('#app/utils/use-root-data.ts', () => ({
	useRootData: () => mockUseRootData(),
}))

import { RecordingForm } from '#app/components/calls/recording-form.tsx'

test('RecordingForm validates the title before uploading audio', async () => {
	vi.clearAllMocks()
	mockUseRootData.mockReturnValue({
		requestInfo: { flyPrimaryInstance: null },
	})
	const fetchMock = vi.fn()
	vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
	const createObjectURL = vi
		.spyOn(URL, 'createObjectURL')
		.mockReturnValue('blob:recording')
	const revokeObjectURL = vi
		.spyOn(URL, 'revokeObjectURL')
		.mockImplementation(() => {})

	try {
		const screen = await render(
			<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
		)

		await screen.getByLabelText('Title').fill('abcd')
		await screen.getByLabelText('Notes (optional)').click()
		await expect
			.element(screen.getByText('Title must be at least 5 characters'))
			.toBeVisible()

		await screen.getByLabelText('Title').fill('')
		await screen.getByRole('button', { name: 'Submit Recording' }).click()
		await expect.element(screen.getByText('Title is required')).toBeVisible()
		expect(fetchMock).not.toHaveBeenCalled()
	} finally {
		createObjectURL.mockRestore()
		revokeObjectURL.mockRestore()
		vi.unstubAllGlobals()
	}
})

test('RecordingForm submits a valid recording and follows the redirect', async () => {
	vi.clearAllMocks()
	mockUseRootData.mockReturnValue({
		requestInfo: { flyPrimaryInstance: 'primary-abc123' },
	})

	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		redirected: true,
		url: 'http://localhost/calls/record/fake-call-id?ok=1#done',
		headers: new Headers(),
	} as unknown as Response)

	vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
	const createObjectURL = vi
		.spyOn(URL, 'createObjectURL')
		.mockReturnValue('blob:recording')
	const revokeObjectURL = vi
		.spyOn(URL, 'revokeObjectURL')
		.mockImplementation(() => {})

	try {
		const recording = new Blob(['audio'], { type: 'audio/webm' })
		const screen = await render(
			<RecordingForm audio={recording} intent="create-call" />,
		)
		await screen.getByLabelText('Title').fill('My First Call')
		await screen.getByRole('button', { name: 'Submit Recording' }).click()

		await expect.poll(() => fetchMock.mock.calls.length).toBe(1)
		expect(fetchMock.mock.calls[0]?.[0]).toBe('/resources/calls/save')
		const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
		expect(requestInit.body).toBeInstanceOf(FormData)
		const body = requestInit.body as FormData
		expect(body.get('title')).toBe('My First Call')
		expect(body.get('audio')).toBeInstanceOf(File)
		const audio = body.get('audio') as File
		expect(audio.size).toBe(recording.size)
		expect(audio.type).toBe(recording.type)
		expect((requestInit.headers as Headers).get('content-type')).toBeNull()
		expect((requestInit.headers as Headers).get('fly-force-instance-id')).toBe(
			'primary-abc123',
		)
		await expect.poll(() => mockNavigate.mock.calls.length).toBe(1)
		expect(mockNavigate).toHaveBeenCalledWith(
			'/calls/record/fake-call-id?ok=1#done',
		)
		expect(mockRevalidate).not.toHaveBeenCalled()
	} finally {
		createObjectURL.mockRestore()
		revokeObjectURL.mockRestore()
		vi.unstubAllGlobals()
	}
})
