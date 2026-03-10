export { App as BoundaryApp } from './boundary.jsx'
export { App as TryCatchApp } from './try-catch.jsx'
export { App as RecoveryApp } from './recovery.jsx'

function Layout(props) {
	const { className, style, ...rest } = props
	return (
		<div
			className={['demo', className].filter(Boolean).join(' ')}
			style={{ minHeight: 900, ...style }}
			{...rest}
		/>
	)
}

export { Layout }
