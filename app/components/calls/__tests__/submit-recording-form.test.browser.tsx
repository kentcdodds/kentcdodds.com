import { describe, expect, it, vi } from 'vitest'
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
		const revokeObjectURL = vi
			.spyOn(URL, 'revokeObjectURL')
			.mockImplementation(() => {})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		try {
			const screen = await render(
				<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
			)
			await screen.getByLabelText('Title').fill('A valid title')
			await screen.getByRole('button', { name: 'Submit Recording' }).click()

			await expect
				.element(screen.getByRole('button', { name: 'Submit Recording' }))
				.toBeEnabled()
			await expect
				.element(screen.getByRole('button', { name: 'Submit Recording' }))
				.toHaveTextContent('Submit Recording')
			await expect
				.element(
					screen.getByText('Unable to read recording. Please try again.'),
				)
				.toBeVisible()
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
						typeof listener === 'function'
							? () => listener(new Event('loadend'))
							: null
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
		const revokeObjectURL = vi
			.spyOn(URL, 'revokeObjectURL')
			.mockImplementation(() => {})

		try {
			const screen = await render(
				<RecordingForm audio={new Blob(['audio'])} intent="create-call" />,
			)
			await screen.getByLabelText('Title').fill('My First Call')
			await screen.getByRole('button', { name: 'Submit Recording' }).click()

			await expect.poll(() => fetchMock.mock.calls.length).toBe(1)
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

			await expect.poll(() => mockNavigate.mock.calls.length).toBe(1)
			expect(mockNavigate).toHaveBeenCalledWith(
				'/calls/record/fake-call-id?ok=1#done',
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
						typeof listener === 'function'
							? () => listener(new Event('loadend'))
							: null
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
		const revokeObjectURL = vi
			.spyOn(URL, 'revokeObjectURL')
			.mockImplementation(() => {})

		const initialData = {
			fields: {
				title: 'Original title',
				notes: 'Original notes',
			},
			errors: {},
		}
		const audio = new Blob(['audio'])

		try {
			const screen = await render(
				<RecordingForm
					audio={audio}
					intent="create-call"
					data={{
						fields: { ...initialData.fields },
						errors: { ...initialData.errors },
					}}
				/>,
			)

			await screen.getByRole('button', { name: 'Submit Recording' }).click()

			await expect.poll(() => fetchMock.mock.calls.length).toBe(1)
			await expect.element(screen.getByText('Title is required')).toBeVisible()

			// Simulate parent rerendering with a fresh but equivalent data object.
			await screen.rerender(
				<RecordingForm
					audio={audio}
					intent="create-call"
					data={{
						fields: { ...initialData.fields },
						errors: { ...initialData.errors },
					}}
				/>,
			)

			await expect.element(screen.getByText('Title is required')).toBeVisible()
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

			const form = document.querySelector('form')
			expect(form?.hasAttribute('novalidate')).toBe(true)

			const titleInput = document.querySelector(
				'input[name="title"]',
			) as HTMLInputElement | null
			expect(titleInput?.maxLength).toBe(80)
			await expect.element(screen.getByText('80 characters left')).toBeVisible()
			const titleId = titleInput?.getAttribute('id')
			expect(titleId).toBeTruthy()
			expect(titleInput?.getAttribute('aria-describedby')).toBe(
				`${titleId}-countdown`,
			)

			await screen.getByLabelText('Title').fill('abcd')
			await expect.element(screen.getByText('76 characters left')).toBeVisible()
			expect(document.body.textContent).not.toContain(
				'Title must be at least 5 characters',
			)

			// Locators don't expose a dedicated `focus()` helper; click focuses.
			await screen.getByLabelText('Notes (optional)').click()
			await expect
				.element(screen.getByText('Title must be at least 5 characters'))
				.toBeVisible()

			const notesInput = document.querySelector(
				'textarea[name="notes"]',
			) as HTMLTextAreaElement | null
			expect(notesInput?.maxLength).toBe(5000)

			// Submit should surface validation and should not attempt to upload audio
			// when validation fails.
			await screen.getByLabelText('Title').fill('')
			await screen.getByRole('button', { name: 'Submit Recording' }).click()
			await expect.element(screen.getByText('Title is required')).toBeVisible()
			expect(fetchMock).not.toHaveBeenCalled()
			const describedBy = titleInput?.getAttribute('aria-describedby') ?? ''
			expect(describedBy).toContain(`${titleId}-error`)
			expect(describedBy).toContain(`${titleId}-countdown`)
		} finally {
			createObjectURL.mockRestore()
			revokeObjectURL.mockRestore()
			vi.unstubAllGlobals()
		}
	})
})
