import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseRootData.mockReturnValue({
			requestInfo: { flyPrimaryInstance: null },
		})
	})

	it('recovers when FileReader.readAsDataURL throws synchronously', async () => {
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
			const user = userEvent.setup()
			render(<RecordingForm audio={new Blob(['audio'])} />)

			const submitButton = screen.getByRole('button', { name: 'Submit Recording' })
			await user.click(submitButton)

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
})
