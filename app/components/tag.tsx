import { clsx } from 'clsx'
import { type ChangeEventHandler } from 'react'

interface TagProps {
	tag: string
	selected: boolean
	onClick?: ChangeEventHandler<HTMLInputElement>
	disabled?: boolean
}

function Tag({ tag, selected, onClick, disabled }: TagProps) {
	return (
		<label
			className={clsx(
				'relative mb-4 mr-4 block h-auto w-auto cursor-pointer rounded-full px-6 py-3 transition',
				{
					'text-primary bg-secondary': !selected,
					'text-inverse bg-inverse': selected,
					'focus-ring opacity-100': !disabled,
					'opacity-25': disabled,
				},
			)}
		>
			<input
				type="checkbox"
				checked={selected}
				onChange={onClick}
				readOnly={!onClick}
				disabled={disabled}
				value={tag}
				className="sr-only"
			/>
			<span>{tag}</span>
		</label>
	)
}

export { Tag }
