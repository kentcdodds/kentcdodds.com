import * as React from 'react'

function IconLink(props: React.ComponentProps<'a'>) {
	return (
		<a
			{...props}
			className={`${
				props.className ?? ''
			} text-primary hover:text-team-current focus:text-team-current focus:outline-none`}
		>
			{props.children}
		</a>
	)
}

export { IconLink }
