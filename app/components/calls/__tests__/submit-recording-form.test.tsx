import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

import { RecordingForm } from '../submit-recording-form.tsx'

describe('RecordingForm', () => {
	it('recovers when FileReader.readAsDataURL throws synchronously', async () => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: null },
		})
		const readAsDataURL = vi.fn(() => {
			throw new TypeError('Unexpected blob state')
		})
		const addEventListener = vi.fn()
		const removeEventListener = vi.fn()
		class ThrowingFileReader {
			result: string | ArrayBuffer | null = null
			addEventListener = addEventListener
			removeEventListener = removeEventListener
			readAsDataURL = readAsDataURL
		}
		vi.stubGlobal(
			'FileReader',
			ThrowingFileReader as unknown as typeof FileReader,
		)
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:recording')
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		try {
			const { container } = render(<RecordingForm audio={new Blob(['audio'])} />)

			const submitButton = screen.getByRole('button', { name: 'Submit Recording' })
			const form = container.querySelector('form')
			expect(form).not.toBeNull()
			fireEvent.submit(form as HTMLFormElement)

			await waitFor(() => expect(submitButton).toBeEnabled())
			expect(submitButton).toHaveTextContent('Submit Recording')
			expect(
				screen.getByText('Unable to read recording. Please try again.'),
			).toBeInTheDocument()
			expect(readAsDataURL).toHaveBeenCalledTimes(1)
			expect(addEventListener).toHaveBeenCalledWith(
				'loadend',
				expect.any(Function),
				{ once: true },
			)
			expect(removeEventListener).toHaveBeenCalledWith(
				'loadend',
				expect.any(Function),
			)
			expect(errorSpy).toHaveBeenCalledWith(
				'Unable to read recording',
				expect.any(TypeError),
			)
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
			errorSpy.mockRestore()
			vi.unstubAllGlobals()
		}
	})

	it('submits to submitAction and navigates on redirect responses', async () => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: 'primary-abc123' },
		})

		let loadEndListener: ((event: ProgressEvent<FileReader>) => void) | null = null
		const readAsDataURL = vi.fn(function (this: SuccessfulFileReader) {
			this.result = 'data:audio/wav;base64,ZmFrZQ=='
			loadEndListener?.(new ProgressEvent('loadend'))
		})

		class SuccessfulFileReader {
			result: string | ArrayBuffer | null = null
			addEventListener(
				eventName: string,
				listener: EventListenerOrEventListenerObject,
			) {
				if (eventName === 'loadend') {
					loadEndListener = listener as (event: ProgressEvent<FileReader>) => void
				}
			}
			removeEventListener() {}
			readAsDataURL = readAsDataURL
		}

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			redirected: true,
			url: 'http://localhost/calls/record/fake-call-id?ok=1#done',
		} as Response)

		vi.stubGlobal(
			'FileReader',
			SuccessfulFileReader as unknown as typeof FileReader,
		)
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:recording')
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

		try {
			const { container } = render(
				<RecordingForm
					audio={new Blob(['audio'])}
					submitAction="/resources/calls/save"
				/>,
			)

			const titleInput = screen.getByLabelText('Title')
			fireEvent.change(titleInput, { target: { value: 'My First Call' } })
			const form = container.querySelector('form')
			expect(form).not.toBeNull()
			fireEvent.submit(form as HTMLFormElement)

			await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
			const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? []
			expect(requestUrl).toBe('/resources/calls/save')
			expect(requestInit?.method).toBe('POST')
			const requestHeaders = requestInit?.headers as Headers
			expect(requestHeaders.get('Content-Type')).toContain(
				'application/x-www-form-urlencoded',
			)
			expect(requestHeaders.get('fly-force-instance-id')).toBe('primary-abc123')

			const requestBody = requestInit?.body as URLSearchParams
			expect(requestBody.get('audio')).toBe('data:audio/wav;base64,ZmFrZQ==')
			expect(requestBody.get('title')).toBe('My First Call')

			await waitFor(() =>
				expect(mockNavigate).toHaveBeenCalledWith(
					'/calls/record/fake-call-id?ok=1#done',
				),
			)
			expect(mockRevalidate).not.toHaveBeenCalled()
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
			vi.unstubAllGlobals()
		}
	})
})
