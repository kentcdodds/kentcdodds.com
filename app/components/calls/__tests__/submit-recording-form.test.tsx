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

import { RecordingForm } from '#app/routes/resources/calls/save.tsx'

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
			const { container } = render(
				<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
			)

			fireEvent.change(screen.getByLabelText('Title'), {
				target: { value: 'A valid title' },
			})

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

	it('submits and navigates using the redirected response URL', async () => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: 'primary-abc123' },
		})

		let loadEndListener: (() => void) | null = null
		const readAsDataURL = vi.fn(function (this: SuccessfulFileReader) {
			this.result = 'data:audio/wav;base64,ZmFrZQ=='
			loadEndListener?.()
		})

		class SuccessfulFileReader {
			result: string | ArrayBuffer | null = null
			addEventListener(
				eventName: string,
				listener: EventListenerOrEventListenerObject,
			) {
				if (eventName === 'loadend') {
					loadEndListener =
						typeof listener === 'function' ? () => listener(new Event('loadend')) : null
				}
			}
			removeEventListener() {}
			readAsDataURL = readAsDataURL
		}

		const jsonMock = vi.fn()
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			redirected: true,
			url: 'http://localhost/calls/record/fake-call-id?ok=1#done',
			headers: new Headers(),
			json: jsonMock,
		} as unknown as Response)

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
				<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
			)

			fireEvent.change(screen.getByLabelText('Title'), {
				target: { value: 'My First Call' },
			})
			const form = container.querySelector('form')
			expect(form).not.toBeNull()
			fireEvent.submit(form as HTMLFormElement)

			await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
			const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? []
			expect(requestUrl).toBe('/resources/calls/save')
			expect(requestInit?.method).toBe('POST')
			expect(requestInit?.redirect).toBeUndefined()
			const requestHeaders = requestInit?.headers as Headers
			expect(requestHeaders.get('Content-Type')).toContain(
				'application/x-www-form-urlencoded',
			)
			expect(requestHeaders.get('fly-force-instance-id')).toBe('primary-abc123')

			const requestBody = requestInit?.body as URLSearchParams
			expect(requestBody.get('intent')).toBe('create-call')
			expect(requestBody.get('audio')).toBe('data:audio/wav;base64,ZmFrZQ==')
			expect(requestBody.get('title')).toBe('My First Call')
			expect(requestBody.get('notes')).toBe('')

			await waitFor(() =>
				expect(mockNavigate).toHaveBeenCalledWith(
					'/calls/record/fake-call-id?ok=1#done',
				),
			)
			expect(mockRevalidate).not.toHaveBeenCalled()
			expect(jsonMock).not.toHaveBeenCalled()
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
			vi.unstubAllGlobals()
		}
	})

	it('preserves server validation errors across equivalent data prop rerenders', async () => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: null },
		})

		let loadEndListener: (() => void) | null = null
		const readAsDataURL = vi.fn(function (this: SuccessfulFileReader) {
			this.result = 'data:audio/wav;base64,ZmFrZQ=='
			loadEndListener?.()
		})

		class SuccessfulFileReader {
			result: string | ArrayBuffer | null = null
			addEventListener(
				eventName: string,
				listener: EventListenerOrEventListenerObject,
			) {
				if (eventName === 'loadend') {
					loadEndListener =
						typeof listener === 'function' ? () => listener(new Event('loadend')) : null
				}
			}
			removeEventListener() {}
			readAsDataURL = readAsDataURL
		}

		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			redirected: false,
			headers: new Headers(),
			json: vi.fn().mockResolvedValue({
				fields: {
					title: '',
					notes: '',
				},
				errors: {
					title: 'Title is required',
				},
			}),
		} as unknown as Response)

		vi.stubGlobal(
			'FileReader',
			SuccessfulFileReader as unknown as typeof FileReader,
		)
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:recording')
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

		const initialData = {
			fields: {
				title: 'Original title',
				notes: 'Original notes',
			},
			errors: {},
		}
		const audio = new Blob(['audio'])

		try {
			const { container, rerender } = render(
				<RecordingForm
					audio={audio}
					intent="create-call"
					data={{
						fields: { ...initialData.fields },
						errors: { ...initialData.errors },
					}}
				/>,
			)

			const form = container.querySelector('form')
			expect(form).not.toBeNull()
			fireEvent.submit(form as HTMLFormElement)

			await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
			await screen.findByText('Title is required')

			// Simulate parent rerendering with a fresh but equivalent data object.
			rerender(
				<RecordingForm
					audio={audio}
					intent="create-call"
					data={{
						fields: { ...initialData.fields },
						errors: { ...initialData.errors },
					}}
				/>,
			)

			await screen.findByText('Title is required')
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
			vi.unstubAllGlobals()
		}
	})

	it('shows validation feedback on blur or submit (and keeps native validation off)', async () => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: null },
		})
		const createObjectURL = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:recording')
		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

		try {
			const { container } = render(
				<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
			)

			const form = container.querySelector('form')
			expect(form).not.toBeNull()
			expect(form).toHaveAttribute('novalidate')

			const titleInput = screen.getByLabelText('Title')
			expect(titleInput).toHaveAttribute('maxLength', '80')
			expect(screen.getByText('80 characters left')).toBeInTheDocument()
			const titleId = titleInput.getAttribute('id')
			expect(titleId).toBeTruthy()
			expect(titleInput).toHaveAttribute('aria-describedby', `${titleId}-countdown`)

			// Submit should surface validation for untouched required fields, but
			// should not attempt to upload audio when validation fails.
			fireEvent.submit(form as HTMLFormElement)
			await screen.findByText('Title is required')
			expect(titleInput.getAttribute('aria-describedby')).toContain(`${titleId}-error`)
			expect(titleInput.getAttribute('aria-describedby')).toContain(
				`${titleId}-countdown`,
			)

			fireEvent.change(titleInput, { target: { value: 'abcd' } })
			expect(screen.getByText('76 characters left')).toBeInTheDocument()
			expect(
				screen.queryByText('Title must be at least 5 characters'),
			).not.toBeInTheDocument()

			fireEvent.blur(titleInput)
			expect(
				screen.getByText('Title must be at least 5 characters'),
			).toBeInTheDocument()

			const notesInput = screen.getByLabelText('Notes (optional)')
			expect(notesInput).toHaveAttribute('maxLength', '5000')
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
		}
	})
})
