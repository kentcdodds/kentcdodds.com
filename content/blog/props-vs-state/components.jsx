import * as React from 'react'

function Add({ n1, n2 = 0 }) {
	return (
		<div>
			{n1} + {n2} = {n1 + n2}
		</div>
	)
}

function AddWithInput({ n1, initialN2 = 0 }) {
	const [n2, setN2] = React.useState(initialN2)
	return (
		<div>
			{n1} +{' '}
			<input
				aria-label="n2"
				type="number"
				value={n2}
				onChange={(e) => setN2(Number(e.target.value))}
			/>{' '}
			= {n1 + n2}
		</div>
	)
}

function Rendered(props) {
	const { className, ...rest } = props
	return (
		<div
			className={['demo', className].filter(Boolean).join(' ')}
			{...rest}
		/>
	)
}

export { Add, AddWithInput, Rendered }
