import { SpinnerIcon } from './icons.tsx'

export function Spinner({
	showSpinner,
	className,
	...spinnerIconProps
}: { showSpinner: boolean } & Parameters<typeof SpinnerIcon>[0]) {
	return (
		<SpinnerIcon
			className={`animate-spin transition-opacity ${
				showSpinner ? 'opacity-100' : 'opacity-0'
			} ${className}`}
			{...spinnerIconProps}
		/>
	)
}
