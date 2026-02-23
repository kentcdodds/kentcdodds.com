import * as React from 'react'

const sleep = (t) =>
	new Promise((resolve) => {
		setTimeout(resolve, t)
	})

function DelayedCounterBug() {
	const [count, setCount] = React.useState(0)
	const increment = async () => {
		await sleep(500)
		setCount(count + 1)
	}
	return <button onClick={increment}>{count}</button>
}

function DelayedCounterWorking() {
	const [count, setCount] = React.useState(0)
	const increment = async () => {
		await sleep(500)
		setCount((previousCount) => previousCount + 1)
	}
	return <button onClick={increment}>{count}</button>
}

function Rendered(props) {
	const { className, ...rest } = props
	return (
		<div className={['demo', className].filter(Boolean).join(' ')} {...rest} />
	)
}

export { DelayedCounterBug, DelayedCounterWorking, Rendered }
