import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CallKentProcessingWarning } from '#app/components/calls/processing-warning.tsx'

test('CallKentProcessingWarning displays recoverable queue failures', async () => {
	const screen = await render(
		<CallKentProcessingWarning message="Unable to enqueue transcription: queue unavailable" />,
	)

	await expect
		.element(screen.getByRole('alert'))
		.toHaveTextContent(
			'Processing warning: Unable to enqueue transcription: queue unavailable',
		)
})

test('CallKentProcessingWarning renders nothing without a warning', async () => {
	const screen = await render(<CallKentProcessingWarning message={null} />)

	await expect.element(screen.getByRole('alert')).not.toBeInTheDocument()
})
