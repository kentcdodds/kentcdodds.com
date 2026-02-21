import * as React from 'react'

function Counter() {
	const [count, setCount] = React.useState(0)
	const increment = () => setCount((c) => c + 1)
	return <button onClick={increment}>{count}</button>
}

function Layout(props) {
	const { className, ...rest } = props
	return (
		<div
			className={['demo', className].filter(Boolean).join(' ')}
			{...rest}
		/>
	)
}

export { Counter, Layout }
